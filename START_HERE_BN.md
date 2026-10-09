# EngJatra — শুরু ও রক্ষণাবেক্ষণ (বাংলা)

EngJatra-এর শিক্ষার্থী অ্যাপ, আলাদা অ্যাডমিন অ্যাপ ও স্থানীয় পরীক্ষার ব্যবস্থা তৈরি হয়েছে। সত্যিকারের Supabase, Cloudflare ও AI সংযোগ এবং শিক্ষার্থীদের সঙ্গে পরীক্ষা এখনো যাচাই করতে হবে। বর্তমান কাজের অবস্থা `docs/STATUS.md`-এ আছে।

## স্থানীয়ভাবে চালানো

Node 24.19.0 ও Python 3.12+ ব্যবহার করো। রিপোর মূল ফোল্ডারে চালাও:

```sh
npm ci
npm run dev
```

শিক্ষার্থী অ্যাপের পোর্ট 5173, অ্যাডমিনের 5174, API-এর 8787। স্থানীয় ডেমো স্পষ্টভাবে চিহ্নিত; এটি সত্যিকারের অ্যাকাউন্ট বা উৎপাদন পরিবেশের অনুমতি নয়। Worker বন্ধ করে আবার চালালে তার ডেমো ডেটা নতুন করে শুরু হয়। সব স্থানীয় পরীক্ষা চালাতে `npm run qa` ব্যবহার করো। বিস্তারিত ব্রাউজার সেটআপ `README.md`-এ আছে।

## ভবিষ্যৎ Codex, AI বা মানব ডেভেলপারের জন্য

প্রথমে `AGENTS.md`, `README.md`, `docs/STATUS.md`, `docs/HANDOFF.md` এবং প্রাসঙ্গিক স্থায়ী স্পেসিফিকেশন পড়তে বলো। বর্তমান বাস্তবায়ন বজায় রেখে নির্দিষ্ট পরিবর্তন করো; নতুন করে অ্যাপ বানানো বা বাতিল পুরোনো কোড কপি করার প্রয়োজন নেই। কাজ ও পরীক্ষার ফল ডকুমেন্টেশনে লিখবে।

## উৎপাদন পরিবেশ চালু করার আগে

`docs/CREDENTIALS_AND_DEPLOYMENT.md` অনুসরণ করে Supabase/Auth/RLS, দুইটি Cloudflare Pages প্রকল্প, Worker ও আলাদা দুইটি AI provider সেটআপ ও পরীক্ষা করো। গোপন key শুধু সংশ্লিষ্ট dashboard-এর secret/environment settings-এ দেবে; GitHub, prompt, chat বা log-এ লিখবে না। প্রকৃত free eligibility যাচাইয়ের আগে AI switches বন্ধ রাখবে।

`engjatra.pages.dev` ঠিকানাটি প্রস্তাবিত, সংরক্ষিত নয়। GitHub-এ কোড প্রকাশ আর উৎপাদন deployment আলাদা কাজ। প্রকৃত deployment, auth, free limits, দ্বিভাষিক কনটেন্ট, আইনগত বিষয় এবং বাস্তব শিক্ষার্থীদের পরীক্ষা শেষে মালিকের অনুমোদনে public launch করবে।

স্থায়ী সিদ্ধান্ত: Bangla-first UI, ছয়টি teaching track, আলাদা সুরক্ষিত admin, Cloudflare/Supabase Free, যাচাইকৃত free Gemma → স্বাধীন free Llama fallback। কোনো স্বয়ংক্রিয় paid upgrade, voice/upload বা certified CEFR দাবির ব্যবস্থা নেই। ব্যক্তিগত editorial status শুধু সুরক্ষিত admin database-এ থাকবে।
