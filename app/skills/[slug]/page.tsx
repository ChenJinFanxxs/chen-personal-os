import { SkillDetail } from "../PrivateSkills";
export default function Page({ params }: { params: { slug: string } }) {
  return <SkillDetail slug={params.slug} />;
}


