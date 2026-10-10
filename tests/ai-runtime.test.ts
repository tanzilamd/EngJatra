import { it, expect } from "vitest";
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { readFileSync } from "node:fs";
import { normalizeUnit } from "../scripts/content-tools";

it("the actual Worker runtime accepts provider transport and rejects redirects without following protected headers", async () => {
  const unit = normalizeUnit(
    JSON.parse(readFileSync("content/units-public/P0/P0-01.json", "utf8")),
  );
  const source = `
    import {callProvider} from './workers/api/src/ai';
    const unit = ${JSON.stringify(unit)};
    const env = {GEMMA_FREE_CONFIRMED:'true',GEMMA_MODEL:'gemma-test-it',GEMMA_API_KEY:'test-fixture-only'};
    export default {async fetch(request) {
      let calls=0,redirect;
      const network=async (url,init)=>{
        const native=new Request(url,init); calls++; redirect=native.redirect;
        if(new URL(request.url).pathname==='/redirect')
          return new Response('',{status:302,headers:{Location:'https://untrusted.invalid/'}});
        const reply={assistant_reply_en:'Hello!',short_explanation_bn:'ভালো শুরু।',feedback_type:'none',suggested_revision_en:null,next_question_en:'How are you?',learning_tags:['vocabulary'],source_unit_id:'P0-01'};
        return Response.json({candidates:[{content:{parts:[{text:JSON.stringify(reply)}]}}]});
      };
      try {const reply=await callProvider('gemma',env,unit,'Hello',network);return Response.json({reply,redirect,calls});}
      catch(error){return Response.json({error:error.code,diagnostic:error.diagnostic,redirect,calls});}
    }};`;
  const compiled = await build({
    stdin: {
      contents: source,
      resolveDir: process.cwd(),
      sourcefile: "runtime-fixture.ts",
    },
    bundle: true,
    format: "esm",
    platform: "browser",
    write: false,
  });
  const runtime = new Miniflare(
    convertV4MiniflareOptions({
      name: "engjatra-ai-runtime-test",
      modules: true,
      compatibilityDate: "2026-10-09",
      compatibilityFlags: ["global_fetch_strictly_public"],
      script: compiled.outputFiles[0].text,
    }),
  );
  try {
    const healthy = await (
      await runtime.dispatchFetch("http://localhost/")
    ).json();
    expect(healthy).toMatchObject({
      calls: 1,
      redirect: "manual",
      reply: {
        assistant_reply_en: "Hello!",
        short_explanation_bn: "ভালো শুরু।",
      },
    });
    expect(JSON.stringify(healthy)).not.toContain("test-fixture-only");
    expect(
      await (await runtime.dispatchFetch("http://localhost/redirect")).json(),
    ).toEqual({
      error: "AI_INVALID_RESPONSE",
      diagnostic: { stage: "http", status: 302 },
      redirect: "manual",
      calls: 1,
    });
  } finally {
    await runtime.dispose();
  }
}, 20000);
