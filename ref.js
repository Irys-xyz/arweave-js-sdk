import 'regenerator-runtime'

import * as nearAPI from 'near-api-js';
import BN from 'bn.js';
import sha256 from 'js-sha256';
import { encode, decode } from 'bs58';
import Mustache from 'mustache';

function accountToLockup(masterAccountId, accountId) {
    return `${sha256(Buffer.from(accountId)).toString('hex').slice(0, 40)}.${masterAccountId}`;
}

function prepareAccountId(data) {
    if (data.toLowerCase().endsWith('.near')) {
        return data.replace('@', '').replace('https://wallet.near.org/send-money/', '').toLowerCase();
    }
    if (data.length == 64 && !data.startsWith('ed25519:')) {
        return data;
    }
    let publicKey;
    if (data.startsWith('NEAR')) {
        publicKey = decode(data.slice(4)).slice(0, -4);
    } else {
        publicKey = decode(data.replace('ed25519:', ''));
    }
    return publicKey.toString('hex');
}

const readOption = (reader, f, defaultValue) => {
    let x = reader.read_u8();
    return x === 1 ? f() : defaultValue;
};

async function viewLockupState(connection, contractId) {
    const result = await connection.provider.sendJsonRpc("query", {
        request_type: "view_state",
        finality: "final",
        account_id: contractId,
        prefix_base64: "U1RBVEU=",
    });
    let value = Buffer.from(result.values[0].value, 'base64');
    let reader = new nearAPI.utils.serialize.BinaryReader(value);
    let owner = reader.read_string();
    let lockupAmount = reader.read_u128().toString();
    let terminationWithdrawnTokens = reader.read_u128().toString();
    let lockupDuration = reader.read_u64().toString();
    let releaseDuration = readOption(reader, () => reader.read_u64().toString(), "0");
    let lockupTimestamp = readOption(reader, () => reader.read_u64().toString(), "0");
    let tiType = reader.read_u8();
    let transferInformation;
    if (tiType === 0) {
        transferInformation = {
            transfers_timestamp: reader.read_u64()
        };
    } else {
        transferInformation = {
            transfer_poll_account_id: reader.read_string()
        };
    }
    let vestingType = reader.read_u8();
    let vestingInformation;
    switch (vestingType) {
        case 1:
            vestingInformation = { vestingHash: reader.read_array(() => reader.read_u8()) };
            break;
        case 2:
            let start = reader.read_u64();
            let cliff = reader.read_u64();
            let end = reader.read_u64();
            vestingInformation = { start, cliff, end };
            break;
        case 3:
            let unvestedAmount = reader.read_u128();
            let terminationStatus = reader.read_u8();
            vestingInformation = { unvestedAmount, terminationStatus };
            break;
        default:
            vestingInformation = 'TODO';
            break;
    }

    return {
        owner,
        lockupAmount: new BN(lockupAmount),
        terminationWithdrawnTokens: new BN(terminationWithdrawnTokens),
        lockupDuration: new BN(lockupDuration),
        releaseDuration: new BN(releaseDuration),
        lockupTimestamp: new BN(lockupTimestamp),
        transferInformation,
        vestingInformation,
    }
}

const options = {
    nodeUrl: 'https://rpc.mainnet.near.org',
    networkId: 'mainnet',
    deps: { }
};

async function lookupLockup(near, accountId) {
    const lockupAccountId = accountToLockup('lockup.near', accountId);
    console.log(lockupAccountId);
    try {
        const lockupAccount = await near.account(lockupAccountId);
        const lockupAccountBalance = await lockupAccount.viewFunction(lockupAccountId, 'get_balance', {});
        const lockupState = await viewLockupState(near.connection, lockupAccountId);
        // More details: https://github.com/near/core-contracts/pull/136
        lockupState.hasBrokenTimestamp = [
            '3kVY9qcVRoW3B5498SMX6R3rtSLiCdmBzKs7zcnzDJ7Q',
            'DiC9bKCqUHqoYqUXovAnqugiuntHWnM3cAc7KrgaHTu'
        ].includes((await lockupAccount.state()).code_hash);
        return { lockupAccountId, lockupAccountBalance, lockupState };
    } catch (error) {
        console.warn(error);
        return { lockupAccountId: `${lockupAccountId} doesn't exist`, lockupAmount: 0 };
    }
}


async function fetchPools(masterAccount) {
    const result = await masterAccount.connection.provider.sendJsonRpc('validators', [null]);
    const pools = new Set();
    const stakes = new Map();
    result.current_validators.forEach((validator) => {
        pools.add(validator.account_id);
        stakes.set(validator.account_id, validator.stake);
    });
    result.next_validators.forEach((validator) => pools.add(validator.account_id));
    result.current_proposals.forEach((validator) => pools.add(validator.account_id));
    let poolsWithFee = [];
    let promises = []
    pools.forEach((accountId) => {
        promises.push((async () => {
            let stake = nearAPI.utils.format.formatNearAmount(stakes.get(accountId), 2);
            let fee = await masterAccount.viewFunction(accountId, 'get_reward_fee_fraction', {});
            poolsWithFee.push({ accountId, stake, fee: `${(fee.numerator * 100 / fee.denominator)}%` });
        })());
    });
    await Promise.all(promises);
    return poolsWithFee;
}

async function updateStaking(near, accountId, lookupAccountId) {
    const template = document.getElementById('pool-template').innerHTML;
    try {
        let masterAccount = await near.account(accountId);
        let pools = await fetchPools(masterAccount);
        let result = [];
        for (let i = 0; i < pools.length; ++i) {
            let directBalance = await masterAccount.viewFunction(pools[i].accountId, "get_account_total_balance", { account_id: accountId });
            let lockupBalance = "0";
            if (lookupAccountId) {
                lockupBalance = await masterAccount.viewFunction(pools[i].accountId, "get_account_total_balance", { account_id: lookupAccountId });
            }
            if (directBalance != "0" || lockupBalance != "0") {
                result.push({
                    accountId: pools[i].accountId,
                    directBalance: nearAPI.utils.format.formatNearAmount(directBalance, 2),
                    lockupBalance: nearAPI.utils.format.formatNearAmount(lockupBalance, 2),
                });
            }
            document.getElementById('pools').innerHTML = Mustache.render(template, {
                result,
                scannedNotDone: i < pools.length - 1,
                scanned: i,
                totalPools: pools.length,
            });
        }
    } catch (error) {
        console.log(error);
    }
}

function getStartLockupTimestamp(lockupState) {
    const phase2Time = new BN("1602614338293769340");
    let lockupTimestamp = BN.max(
      phase2Time.add(lockupState.lockupDuration),
      lockupState.lockupTimestamp
    );
    return lockupState.hasBrokenTimestamp ? phase2Time : lockupTimestamp;
}

const saturatingSub = (a, b) => {
    let res = a.sub(b);
    return res.gte(new BN(0)) ? res : new BN(0);
};

// https://github.com/near/core-contracts/blob/master/lockup/src/getters.rs#L64
async function getLockedTokenAmount(lockupState) {
    const phase2Time = new BN("1602614338293769340");
    let now = new BN((new Date().getTime() * 1000000).toString());
    if (now.lte(phase2Time)) {
        return saturatingSub(
          lockupState.lockupAmount,
          lockupState.terminationWithdrawnTokens
        );
    }

    let lockupTimestamp = BN.max(
      phase2Time.add(lockupState.lockupDuration),
      lockupState.lockupTimestamp
    );
    let blockTimestamp = now;
    if (blockTimestamp.lt(lockupTimestamp)) {
        return saturatingSub(
          lockupState.lockupAmount,
          lockupState.terminationWithdrawnTokens
        );
    }

    let unreleasedAmount;
    if (lockupState.releaseDuration) {
        let startTimestamp = getStartLockupTimestamp(lockupState);
        let endTimestamp = startTimestamp.add(lockupState.releaseDuration);
        if (endTimestamp.lt(blockTimestamp)) {
            unreleasedAmount = new BN(0);
        } else {
            let timeLeft = endTimestamp.sub(blockTimestamp);
            unreleasedAmount = lockupState.lockupAmount
              .mul(timeLeft)
              .div(lockupState.releaseDuration);
        }
    } else {
        unreleasedAmount = new BN(0);
    }

    let unvestedAmount;
    if (lockupState.vestingInformation) {
        if (lockupState.vestingInformation.unvestedAmount) {
            // was terminated
            unvestedAmount = lockupState.vestingInformation.unvestedAmount;
        } else if (lockupState.vestingInformation.start) {
            // we have schedule
            if (blockTimestamp.lt(lockupState.vestingInformation.cliff)) {
                unvestedAmount = lockupState.lockupAmount;
            } else if (blockTimestamp.gte(lockupState.vestingInformation.end)) {
                unvestedAmount = new BN(0);
            } else {
                let timeLeft = lockupState.vestingInformation.end.sub(blockTimestamp);
                let totalTime = lockupState.vestingInformation.end.sub(
                  lockupState.vestingInformation.start
                );
                unvestedAmount = lockupState.lockupAmount.mul(timeLeft).div(totalTime);
            }
        }
    }
    if (unvestedAmount === undefined) {
        unvestedAmount = new BN(0);
    }

    return BN.max(
      saturatingSub(unreleasedAmount, lockupState.terminationWithdrawnTokens),
      unvestedAmount
    );
}

function formatVestingInfo(info) {
    if (!info.hasOwnProperty("start")) return "TODO";
    const start = new Date(info.start.divn(1000000).toNumber());
    const cliff = new Date(info.cliff.divn(1000000).toNumber());
    const end = new Date(info.end.divn(1000000).toNumber());
    return `from ${start} until ${end} with cliff at ${cliff}`;
}

async function lookup() {
    const inputAccountId = document.querySelector('#account').value;
    window.location.hash = inputAccountId;
    const near = await nearAPI.connect(options);
    let accountId = prepareAccountId(inputAccountId);

    let lockupAccountId = '', lockupAccountBalance = 0, ownerAccountBalance = 0, lockupReleaseStartTimestamp = new BN(0), lockupState = null, lockedAmount = 0;
    const template = document.getElementById('template').innerHTML;
    document.getElementById('pools').innerHTML = '';
    try {
        let account = await near.account(accountId);
        let state = await account.state();
        ownerAccountBalance = state.amount;
        ({ lockupAccountId, lockupAccountBalance, lockupState } = await lookupLockup(near, accountId));
        if (lockupState) {
            lockupReleaseStartTimestamp = getStartLockupTimestamp(lockupState);
            lockedAmount = await getLockedTokenAmount(lockupState);
            lockupState.releaseDuration = lockupState.releaseDuration.div(new BN("1000000000"))
              .divn(60)
              .divn(60)
              .divn(24)
              .toString(10);
            lockupState.vestingInformation = formatVestingInfo(lockupState.vestingInformation);
        }
    } catch (error) {
        console.error(error);
    }
    console.log(lockupState);

    document.getElementById('output').innerHTML = Mustache.render(template, {
        accountId,
        lockupAccountId,
        ownerAccountBalance: nearAPI.utils.format.formatNearAmount(ownerAccountBalance, 2),
        lockedAmount: nearAPI.utils.format.formatNearAmount(lockedAmount.toString(), 2),
        liquidAmount: nearAPI.utils.format.formatNearAmount(new BN(lockupAccountBalance).sub(new BN(lockedAmount)).toString(), 2),
        totalAmount: nearAPI.utils.format.formatNearAmount(new BN(ownerAccountBalance).add(new BN(lockupAccountBalance)).toString(), 2),
        lockupReleaseStartDate: new Date(lockupReleaseStartTimestamp.divn(1000000).toNumber()),
        lockupState,
     });

    await updateStaking(near, accountId, lockupAccountId);
}

window.nearAPI = nearAPI;
window.lookup = lookup;

window.onload = () => {
    if (window.location.hash) {
        document.querySelector('#account').value = window.location.hash.slice(1);
        lookup();
    }
};
