import {generateKeyPairSync} from "node:crypto";

const {publicKey,privateKey}=generateKeyPairSync("ec",{namedCurve:"prime256v1"});
const publicJwk=publicKey.export({format:"jwk"}),privateJwk=privateKey.export({format:"jwk"});
const decode=value=>Buffer.from(value,"base64url");
const vapidPublicKey=Buffer.concat([Buffer.from([4]),decode(publicJwk.x),decode(publicJwk.y)]).toString("base64url");
const vapidPrivateKey=decode(privateJwk.d).toString("base64url");

console.log(JSON.stringify({
  VAPID_PUBLIC_KEY:vapidPublicKey,
  VAPID_PRIVATE_KEY:vapidPrivateKey,
  VAPID_SUBJECT:"https://www.hoclaixecungdat.com/"
},null,2));
