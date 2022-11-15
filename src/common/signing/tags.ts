//tag serde
export function zigzag_encode(i) {
    return (i >> 31) ^ (i << 1);
}

export function zigzag_decode(i: any) {
    return (i >>> 1) ^ -(i & 1);
}

//'''stolen''' from https://github.com/Dev43

export function serializeTags(tags: { name: string, value: string; }[]) {
    let byt = Buffer.from("");
    //if (!tags) return byt;
    // we first add the count of tag elements (https://avro.apache.org/docs/1.11.1/specification/#arrays-1)
    byt = Buffer.concat([byt, Buffer.from([zigzag_encode(tags.length)])]);
    // each tag record is encoded following https://avro.apache.org/docs/1.11.1/specification/#arrays-1
    for (let tag of tags) {
        let name = Buffer.from(tag.name);
        let value = Buffer.from(tag.value);
        byt = Buffer.concat([byt, Buffer.from([zigzag_encode(name.byteLength)])]);
        byt = Buffer.concat([byt, name]);
        byt = Buffer.concat([byt, Buffer.from([zigzag_encode(value.byteLength)])]);
        byt = Buffer.concat([byt, value]);
    }
    // we terminate it with a 0 based on https://avro.apache.org/docs/1.11.1/specification/#arrays-1
    byt = Buffer.concat([byt, Buffer.from([zigzag_encode(0)])]);
    return byt;
}


export function deserializeTags(bTags: Buffer): { name: string, value: string; }[] {
    let tags = [];
    if (bTags.length === 0) return [];
    let index = 0;
    let length = 0;
    while ((length = zigzag_decode(bTags.readInt8(index++))) > 0) {
        for (let i = 0; i < length; i++) {
            const nameLength = zigzag_decode(bTags.readInt8(index++));
            const name = bTags.slice(index, index += nameLength).toString();
            const valueLength = zigzag_decode(bTags.readInt8(index++));
            const value = bTags.slice(index, index += valueLength).toString();
            tags.push({ name, value });
        }
    }
    return tags;
}