import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import galleryAccess from "../../server/api/gallery-access.js";
import fileUrl from "../../server/api/file-url.js";
import download from "../../server/api/download.js";
import createShare from "../../server/api/admin-share-link.js";
import { signSupabaseJwt, verifySupabaseJwt } from "../../server/api/_lib/jwt.js";
import { hashPassword } from "../../server/api/_lib/util.js";

const secret = "test-only-gallery-signing-secret";
const fixtures = { SUPABASE_URL: "https://gallery-fixture.invalid", SUPABASE_SERVICE_ROLE_KEY: "fixture-only", SUPABASE_JWT_SECRET: secret,
  R2_ACCOUNT_ID: "fixture", R2_ACCESS_KEY_ID: "fixture-only", R2_SECRET_ACCESS_KEY: "fixture-only", R2_BUCKET: "fixture", R2_PUBLIC_BASE: "https://media-fixture.invalid" };
const oldEnv = Object.fromEntries(Object.keys(fixtures).map(k => [k,process.env[k]]));
Object.assign(process.env, fixtures);
const oldFetch = globalThis.fetch;
let rows, calls, failClaim;
function match(row, params) {
  for (const [field, filter] of params) {
    if (["select", "order", "limit"].includes(field)) continue;
    const actual = row[field] ?? null;
    if (filter === "is.null") { if (actual !== null) return false; continue; }
    if (filter.startsWith("eq.")) { if (String(actual) !== filter.slice(3)) return false; continue; }
    if (filter.startsWith("gt.")) { if (!(Date.parse(actual) > Date.parse(filter.slice(3)))) return false; continue; }
    throw new Error(`Unimplemented fixture filter: ${filter}`);
  }
  return true;
}
globalThis.fetch = async (input, opts={}) => {
  const url = new URL(String(input));
  assert.equal(url.host, "gallery-fixture.invalid", "real requests are forbidden");
  const table = url.pathname.replace("/rest/v1/", "");
  assert.ok(Object.hasOwn(rows, table));
  const method = opts.method || "GET";
  calls.push({table, method, filters:[...url.searchParams]});
  if (failClaim && method === "PATCH") return new Response(JSON.stringify({message:"fixture unavailable"}),{status:503});
  let found = rows[table].filter(r => match(r,url.searchParams));
  if (method === "POST") { const body=JSON.parse(opts.body); found=[{id:crypto.randomUUID(),...body}]; rows[table].push(...found); }
  else if (method === "PATCH") { for (const row of found) Object.assign(row,JSON.parse(opts.body)); }
  else if (method === "DELETE") rows[table]=rows[table].filter(r=>!found.includes(r));
  else assert.equal(method,"GET");
  const result=JSON.parse(JSON.stringify(found));
  const singular=new Headers(opts.headers).get("Accept")?.includes("vnd.pgrst.object+json");
  return new Response(JSON.stringify(singular?(result[0]??null):result),{headers:{"Content-Type":"application/json"}});
};
test.after(()=>{globalThis.fetch=oldFetch;for(const [k,v] of Object.entries(oldEnv)){if(v===undefined)delete process.env[k];else process.env[k]=v;}});
function seed(expiry=null) {
  const link={id:"share-a",token:"fixture-token",gallery_id:"gallery-a",password_hash:null,can_download:false,expires_at:expiry};
  rows={share_links:[link],galleries:[{id:"gallery-a",published:true,title:"Fixture A"},{id:"gallery-b",published:true,title:"Fixture B"}],
    assets:[{id:"asset-a",gallery_id:"gallery-a",storage_key:"gallery-a/orig/a.jpg"},{id:"asset-b",gallery_id:"gallery-b",storage_key:"gallery-b/orig/b.jpg"},{id:"asset-a2",gallery_id:"gallery-a",storage_key:"gallery-a/orig/a2.jpg"}],
    albums:[],selections:[],photo_comments:[],download_tokens:[{id:"download-a",token:"download-token",gallery_id:"gallery-a",asset_id:"asset-a",quality:"original",expires_at:expiry,max_uses:1,used_count:0}]};
  calls=[];failClaim=false;return link;
}
function ticket(extra={}) {return signSupabaseJwt({sub:"fixture-viewer",gallery_access:true,share_id:"share-a",gallery_id:"gallery-a",...extra},secret,3600);}
function req(body={},method="POST",query={}) {return {method,body,query,headers:{cookie:"yel_csrf=fixture","x-csrf-token":"fixture"},socket:{remoteAddress:"127.0.0.218"}};}
async function run(handler,request) {const res={statusCode:200,body:null,headers:{},status(c){this.statusCode=c;return this;},json(b){this.body=b;return this;},setHeader(k,v){this.headers[k]=v;},redirect(c,u){this.statusCode=c;this.location=u;return this;}};await handler(request,res);return res;}

test("JWT rejects missing/malformed expiry, exact expiry, future nbf and signed wrong algorithm",()=>{
  const now=Math.floor(Date.now()/1000);
  for (const exp of [undefined,null,0,now,now-1,String(now+60),"bad",1.5]) assert.equal(verifySupabaseJwt(signSupabaseJwt({sub:"fixture",exp},secret),secret),null);
  assert.equal(verifySupabaseJwt(signSupabaseJwt({sub:"fixture",nbf:now+60},secret),secret),null);
  const encode=x=>Buffer.from(JSON.stringify(x)).toString("base64url");
  const content=`${encode({alg:"none"})}.${encode({sub:"fixture",exp:now+60})}`;
  const signed=`${content}.${crypto.createHmac("sha256",secret).update(content).digest("base64url")}`;
  assert.equal(verifySupabaseJwt(signed,secret),null);
  assert.equal(verifySupabaseJwt(signSupabaseJwt({sub:"fixture"},secret),secret).sub,"fixture");
});

test("share password, published gallery and scoped gallery access are required",async()=>{
  const link=seed();link.password_hash=hashPassword("fixture-password");
  assert.equal((await run(galleryAccess,req({action:"open",token:link.token}))).statusCode,403);
  const open=await run(galleryAccess,req({action:"open",token:link.token,password:"fixture-password"}));
  assert.equal(open.statusCode,200);assert.deepEqual(open.body.assets.map(a=>a.id),["asset-a","asset-a2"]);
  assert.equal(open.body.canDownload,false);assert.equal(open.body.gallery.clientPhone,undefined);
  assert.equal((await run(galleryAccess,req({action:"open",token:link.token,password:"fixture-password",galleryId:"gallery-b"}))).statusCode,403);
  rows.galleries[0].published=false;
  assert.equal((await run(galleryAccess,req({action:"open",token:link.token,password:"fixture-password"}))).statusCode,404);
});

test("malformed and expired link TTL deny gallery, ticket action, file URL and download",async()=>{
  for(const expires of ["invalid", "", new Date(Date.now()-1).toISOString()]) {
    const link=seed(expires);
    assert.equal((await run(galleryAccess,req({action:"open",token:link.token}))).statusCode,404);
    assert.equal((await run(galleryAccess,req({action:"toggle",accessTicket:ticket(),assetId:"asset-a",kind:"like"}))).statusCode,404);
    const request=req({},"GET",{key:"gallery-a/orig/a.jpg"});request.headers["x-gallery-access"]=ticket();
    assert.equal((await run(fileUrl,request)).statusCode,403);
    assert.equal((await run(download,req({},"GET",{token:"download-token"}))).statusCode,410);
    assert.equal(rows.download_tokens[0].used_count,0);
  }
});

test("revoked share and unpublished gallery invalidate previously issued tickets",async()=>{
  for(const revoke of [()=>{rows.share_links=[];},()=>{rows.galleries[0].published=false;}]) {
    seed();const issued=ticket();revoke();
    assert.equal((await run(galleryAccess,req({action:"toggle",accessTicket:issued,assetId:"asset-a",kind:"like"}))).statusCode,404);
    const request=req({},"GET",{key:"gallery-a/orig/a.jpg"});request.headers["x-gallery-access"]=issued;
    assert.equal((await run(fileUrl,request)).statusCode,403);assert.equal(rows.selections.length,0);
  }
});

test("valid ticket allows its gallery but cannot mutate or presign another gallery asset",async()=>{
  seed();const issued=ticket();
  assert.equal((await run(galleryAccess,req({action:"toggle",accessTicket:issued,assetId:"asset-a",kind:"like"}))).statusCode,200);
  assert.equal((await run(galleryAccess,req({action:"toggle",accessTicket:issued,assetId:"asset-b",kind:"like"}))).statusCode,400);
  for(const [key,status] of [["gallery-a/orig/a.jpg",200],["gallery-b/orig/b.jpg",403]]) {
    const request=req({},"GET",{key});request.headers["x-gallery-access"]=issued;assert.equal((await run(fileUrl,request)).statusCode,status);
  }
  assert.equal(rows.selections.length,1);
});

test("parallel download claims cannot exceed a one-use token",async()=>{
  seed();const answers=await Promise.all(Array.from({length:5},()=>run(download,req({},"GET",{token:"download-token"}))));
  assert.equal(answers.filter(r=>r.statusCode===302).length,1);
  assert.equal(answers.filter(r=>r.statusCode===429).length,4);assert.equal(rows.download_tokens[0].used_count,1);
});

test("download must respect asset-bound tokens and fails closed when claim storage fails",async()=>{
  seed();assert.equal((await run(download,req({},"GET",{token:"download-token",asset:"asset-b"}))).statusCode,403);
  assert.equal((await run(download,req({},"GET",{token:"download-token",asset:"asset-a2"}))).statusCode,403);
  assert.equal(rows.download_tokens[0].used_count,0);
  failClaim=true;assert.equal((await run(download,req({},"GET",{token:"download-token"}))).statusCode,503);
});

test("invalid share expiry cannot silently create an unlimited link",async()=>{
  seed();const request=req({galleryId:"gallery-a",expiresAt:"invalid"});request.headers.cookie+=`; yel_admin_session=${signSupabaseJwt({sub:"fixture-admin",app_role:"admin"},secret)}`;
  assert.equal((await run(createShare,request)).statusCode,400);
  assert.equal(rows.share_links.length,1);
  request.body.expiresAt=null;assert.equal((await run(createShare,request)).statusCode,200);assert.equal(rows.share_links[1].expires_at,null);
});
