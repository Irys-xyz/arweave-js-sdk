import { deserializeTags, serializeTags, zigzag_decode, zigzag_encode } from "../src/common/signing/tags";

(async function () {
    const enc = zigzag_encode(10);
    const dec = zigzag_decode(enc);
    console.log(dec);

    const tags = [{ name: "test", value: "test" }];

    const ser = serializeTags(tags);

    const des = deserializeTags(ser);

    console.log(des);



})();