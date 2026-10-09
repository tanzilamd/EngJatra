// Database administration is confined to an Auth fixture created by this run.
// SQL never grants broad table privileges, changes RLS or creates an owner.
export function reviewerFixtureQuery(id: string, email: string) {
  const uuid = "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}";
  if (
    !new RegExp(`^${uuid}$`).test(id) ||
    !new RegExp(`^engjatra-qa-${uuid}@example\\.invalid$`).test(email)
  )
    throw Error(
      "Only a newly created disposable QA identity may receive temporary reviewer access",
    );
  return `insert into public.admin_memberships(user_id,role)
    select id,'content_reviewer' from auth.users
    where id='${id}'::uuid and email='${email}'
      and raw_user_meta_data->>'engjatra_test_fixture'='true'
      and not exists(select 1 from public.admin_memberships where user_id='${id}'::uuid)
    returning role`;
}
