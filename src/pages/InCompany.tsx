import { PageHero } from "@/components/site/PageHero";
import { SiteBlocks } from "@/components/site/SiteBlocks";
import { useSiteSection } from "@/hooks/useSiteSection";
import { PAGE_SECTIONS, INCOMPANY_DEFAULTS, PageSettings } from "@/lib/siteSettings";
import inCompany from "@/assets/in-company.jpg";
import hero from "@/assets/hero-industrial.jpg";

const FALLBACK_GALLERY = [hero, inCompany];

const InCompany = () => {
  const { value } = useSiteSection<PageSettings>(PAGE_SECTIONS.incompany, INCOMPANY_DEFAULTS);
  const blocks = value.blocks.map((b) => {
    if (b.kind === "image_text" && !b.image_url) return { ...b, image_url: inCompany };
    if (b.id === "inc_videos") {
      return { ...b, items: b.items.map((it, i) => ({ ...it, image_url: it.image_url || FALLBACK_GALLERY[i % 2] })) };
    }
    return b;
  });

  return (
    <>
      <PageHero eyebrow={value.hero_eyebrow} title={value.hero_title} description={value.hero_description} />
      <SiteBlocks blocks={blocks} />
    </>
  );
};
export default InCompany;
