import { PageHero } from "@/components/site/PageHero";
import { SiteBlocks } from "@/components/site/SiteBlocks";
import { useSiteSection } from "@/hooks/useSiteSection";
import { PAGE_SECTIONS, SOBRE_DEFAULTS, PageSettings } from "@/lib/siteSettings";
import sobreUsina from "@/assets/sobre-usina.jpg";

const Sobre = () => {
  const { value } = useSiteSection<PageSettings>(PAGE_SECTIONS.sobre, SOBRE_DEFAULTS);
  const blocks = value.blocks.map((b) =>
    b.id === "sobre_historia" && !b.image_url ? { ...b, image_url: sobreUsina } : b
  );

  return (
    <>
      <PageHero eyebrow={value.hero_eyebrow} title={value.hero_title} description={value.hero_description} />
      <SiteBlocks blocks={blocks} />
    </>
  );
};
export default Sobre;
