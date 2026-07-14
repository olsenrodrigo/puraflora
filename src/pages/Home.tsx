import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import Hero from "@/components/home/Hero";
import Marquee from "@/components/home/Marquee";
import ValueProps from "@/components/home/ValueProps";
import Categories from "@/components/home/Categories";
import FeaturedStore from "@/components/home/FeaturedStore";
import Philosophy from "@/components/home/Philosophy";
import HowItWorks from "@/components/home/HowItWorks";
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
      <ValueProps />
      <Categories />
      <FeaturedStore />
      <Philosophy />
      <HowItWorks />
      <Testimonials />
      <Newsletter />
    </>
  );
}
