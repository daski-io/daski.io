import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {executeTool} from "../src/mcp/execute.ts";
import {GatewayClient} from "../src/mcp/gateway.ts";
import {resolveNetworkConfig} from "../src/lib/network.ts";
const directory=process.env.DASKI_GATEWAY_WIRE_FIXTURES ?? resolve("test/fixtures/gateway-wire");
const fixture=name=>JSON.parse(readFileSync(resolve(directory,name),"utf8"));
const prepared=fixture("payment-challenge-prepared.json");
const extensions=fixture("payment-required-extensions.json");
const config=resolveNetworkConfig({SITE_URL:"https://website.example",GATEWAY_URL:"https://sandbox-gateway.daski.io"});
const args={providerAgentId:"8327",outcomeId:"register-domain",request:{name:"example.info"},payerAddress:"0x"+"a".repeat(40)};
function client(response) {
 const calls=[];
 const gateway=new GatewayClient(config,undefined,async(url,options)=>{
  if(new URL(url).pathname==="/.well-known/mcp.json") return Response.json({confirmationSigning:{chainId:84532}});
  calls.push({url,body:options.body?JSON.parse(options.body):null,headers:options.headers});
  return response();
 });
 return {gateway,calls};
}
const invoke=(name,args,gateway,meta)=>executeTool(name,args,meta,gateway,()=>{throw new Error("No guide requested");});
test("actual website quote consumer preserves exact gateway challenge and payment extensions",async()=>{
 const {gateway,calls}=client(()=>Response.json(prepared.structuredContent));
 const result=await invoke("daski_get_payment_challenge",args,gateway);
 assert.notEqual(result.isError,true);
 assert.deepEqual(result.structuredContent,prepared.structuredContent);
 assert.deepEqual(result._meta["x402/payment-required"],prepared.structuredContent.paymentRequired);
 assert.deepEqual(calls[0].body,{request:args.request,payerAddress:args.payerAddress});
 assert.equal(result._meta["x402/payment-required"].extensions["payment-identifier"].info.id,
  prepared.structuredContent.paymentRequired.extensions["payment-identifier"].info.id);
});
test("cached website client's unpaid purchase preserves complete 402 response",async()=>{
 const challenge={...prepared.structuredContent.paymentRequired,extensions};
 const {gateway}=client(()=>Response.json(challenge,{status:402}));
 const result=await invoke("daski_buy_outcome",args,gateway);
 assert.equal(result.isError,true);
 assert.deepEqual(result._meta["x402/payment-required"],challenge);
 assert.deepEqual(result.structuredContent,challenge);
});
test("saved review request and signature survive unsupported-client response",async()=>{
 const request={phase:"submit",reviewProtocol:1,preparationId:"saved-preparation",signature:"0x"+"b".repeat(130)};
 const authorization={signature:"0x"+"c".repeat(130),nonce:"saved-nonce"};
 const error={code:"CONFIRMATION_CLIENT_UPGRADE_REQUIRED",message:"Upgrade; preserve admitted work",retryable:false,
  requiresNewSignature:false,expected:{preparationId:"saved-preparation",admitted:true}};
 const {gateway,calls}=client(()=>Response.json({error},{status:409}));
 const result=await invoke("daski_confirm_delivery",{orderHandle:"saved-order",request,authorization},gateway);
 assert.equal(result.isError,true);
 assert.equal(result.structuredContent.code,error.code);
 assert.equal(result.structuredContent.requiresNewSignature,false);
 assert.deepEqual(calls[0].body,{request,authorization});
});
test("read-only resume does not submit a replacement payment",async()=>{
 const {gateway,calls}=client(()=>Response.json({state:"SETTLEMENT_AMBIGUOUS",orderHandle:"existing",paymentMayHaveSettled:true}));
 const result=await invoke("daski_get_order_status",{orderHandle:"existing",readCapability:"r".repeat(80)},gateway);
 assert.equal(result.structuredContent.paymentMayHaveSettled,true);
 assert.equal(calls.length,1);
 assert.match(calls[0].url,/\/actions\/status$/);
 assert.deepEqual(calls[0].body,{request:{}});
});
