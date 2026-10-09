import { it, expect } from "vitest";
import { reviewerFixtureQuery } from "../scripts/live-auth-fixture";
it("confines reviewer setup to a marked disposable identity and rejects arbitrary users/injection", () => {
  const id = "12345678-1234-1234-1234-123456789abc";
  const email = `engjatra-qa-${id}@example.invalid`;
  const query = reviewerFixtureQuery(id, email);
  expect(query).toContain(
    "raw_user_meta_data->>'engjatra_test_fixture'='true'",
  );
  expect(query).toContain("and email=");
  expect(query).toContain("'content_reviewer'");
  expect(query).not.toMatch(/\b(owner|grant|alter|delete|update)\b/i);
  for (const [uid, address] of [
    [id, "owner@example.com"],
    ["' or true --", email],
    [id, `${email}' or true --`],
  ])
    expect(() => reviewerFixtureQuery(uid, address)).toThrow(
      /Only a newly created/,
    );
});
