import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import Hero from "@/components/home/Hero";
import Marquee from "@/components/home/Marquee";
import BetoMunhoz from "@/components/home/BetoMunhoz";
import ValueProps from "@/components/home/ValueProps";
import Categories from "@/components/home/Categories";
import FeaturedStore from "@/components/home/FeaturedStore";
import QualitySeal from "@/components/home/QualitySeal";
import Philosophy from "@/components/home/Philosophy";
import HowItWorks from "@/components/home/HowItWorks";
import BrandInterlude from "@/components/home/BrandInterlude";
import Testimonials from "@/components/home/Testimonials";
import Newsletter from "@/components/home/Newsletter";

export default function Home() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = `PuraFlora — ${t("brand.tagline")}`;
  }, [t]);

  return (
    <>
      <Hero />
      <Marquee />
      <BetoMunhoz />
      <ValueProps />
      <Categories />
      <FeaturedStore />
      <QualitySeal />
      <Philosophy />
      <HowItWorks />
      <BrandInterlude />
      <Testimonials />
      <Newsletter />
    </>
  );
}
