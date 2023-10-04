async function main(host: string, currency: string, wallet: string, address: string) {
  const flags = `-h ${host} -c ${currency} -w ${wallet}`;
  let commands = [`upload data.txt`, `balance ${address}`, `upload-dir ./testFolder`, `fund 1000`, `withdraw 1000`];
  commands.map((c) => {
    console.log(`irys ${c} ${flags}`);
    return;
  });
}

main(
  process.argv[2] ?? "http://devnet.bundlr.network",
  process.argv[3] ?? "arweave",
  process.argv[4] ?? "aaaaa",
  process.argv[5] ?? "7smNXWVNbTinRPuKbrke0XR0N9N6FgTBVCh20niXEbU",
);
