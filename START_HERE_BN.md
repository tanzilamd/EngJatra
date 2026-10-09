# EngJatra — GitHub/Codex সেটআপ (বাংলা)

**এটি সম্পূর্ণ Development Handoff Pack। অ্যাপ এখনো বানানো হয়নি। Codex-কে কাজ শুরু করতে এই ফাইলগুলো ব্যবহার করতে হবে।**

## প্রথমবার যা করবে
1. GitHub-এ `engjatra` নামে **নতুন Private Repository** বানাও (বা নতুন খালি repo connect করো)। পুরোনো বাতিল Code কপি করবে না।
2. **পদ্ধতি A (সবচেয়ে ভালো):** ZIP Download করে Extract করো, তার **ভেতরের সব File/Folder** রিপোর Root-এ Upload করো (`AGENTS.md` Root-এ থাকবে)। **পদ্ধতি B (সহজ):** শুধু ZIP ফাইল Repo-তে Upload করো, তারপর নিচের Activation Message দিয়ে Codex-কে বলো আগে ZIP Extract করে `AGENTS.md`-সহ সব Content Repo Root-এ বসাতে। GitHub নিজে ZIP Extract করে না।
3. Codex-এ ওই Repository নির্বাচন করো। `CODEX_MASTER_PROMPT.md` খুলে পুরো Prompt কপি করে Codex-এ পাঠাও।
4. Codex-কে Coding, UI, Backend, Admin, Tests, Documentation সব বাস্তবায়ন ও QA চালাতে দাও। Credentials নেই বলে বাকি কাজ বন্ধ করা যাবে না; local demo/mock দিয়ে পরীক্ষা করবে।
5. পরে Supabase/Cloudflare/AI Provider Credentials দেবে **সংশ্লিষ্ট Dashboard-এর Secret/Environment Settings-এ**। GitHub Repository/Prompt/Chat-এ API Key লিখবে না।
6. Codex-এর `docs/STATUS.md` ও `docs/CREDENTIALS_AND_DEPLOYMENT.md` দেখে কী Ready, কী Blocked, আর কী Setup করতে হবে বুঝবে।
7. সত্যিকারের Cloudflare Deployment, Domain Available কি না, Supabase Auth/RLS এবং AI Provider Free Limits পরীক্ষা শেষে তবেই Public Launch করবে।

## গুরুত্বপূর্ণ সিদ্ধান্ত
- নাম: EngJatra
- Hosting: Cloudflare Pages Free (+ প্রয়োজনীয় Free Worker/Functions)
- Database/Auth: Supabase Free; Public Content: Cloudflare-এ JSON/CDN
- AI: Free Gemma → Free Llama fallback (actual API provider যাচাই সাপেক্ষে)
- Learning Levels: Pre-A1, A1, A2, B1, B2, C1-oriented
- Admin Panel: আলাদা ও সুরক্ষিত; Content Verification Status **শুধু Admin-এ**
- পুরোনো Development Code বাতিল; নতুন Codebase সম্পূর্ণ Fresh
- Goal: Zero mandatory spend, honest free-tier limits (unlimited traffic/AI guarantee নয়)

## যে ২টি ফাইল সবচেয়ে দরকার
`AGENTS.md` = সকল ভবিষ্যৎ Codex/AI/Human Developer-এর স্থায়ী নিয়ম।
`CODEX_MASTER_PROMPT.md` = প্রথমবার Codex-কে দিতে হবে এমন পূর্ণ Development নির্দেশনা।

**ফাইলগুলো ZIP থেকে Extract না করে শুধু Codex Prompt-এ ZIP নাম লিখলে Codex সব কনটেন্ট পড়তে নাও পারে।** Root-এ Extracted Files পাওয়া নিশ্চিত করো।
