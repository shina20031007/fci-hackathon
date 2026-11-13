"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { useLanguage } from "@/lib/i18n/provider";
import type { CivicProject } from "@/lib/validation/project";
import styles from "./home-view.module.css";

const topics: {
  category: CivicProject["category"];
  title: string;
  description: string;
  image: string;
}[] = [
  {
    category: "Transportation",
    title: "Transportation",
    description: "Streets, transit, and the ways we move.",
    image: "transportation",
  },
  {
    category: "Housing",
    title: "Housing",
    description: "Homes and the neighbourhoods around them.",
    image: "housing",
  },
  {
    category: "Land Use and Zoning",
    title: "Land Use & Zoning",
    description: "How places grow and change.",
    image: "land-use",
  },
  {
    category: "Infrastructure",
    title: "Infrastructure",
    description: "The systems that keep a city running.",
    image: "infrastructure",
  },
  {
    category: "Environment",
    title: "Environment",
    description: "Parks, natural spaces, and climate.",
    image: "environment",
  },
  {
    category: "Municipal Budget",
    title: "Municipal Budget",
    description: "Local priorities and public spending.",
    image: "budget",
  },
  {
    category: "Public Services",
    title: "Public Services",
    description: "The services we share every day.",
    image: "services",
  },
];

export function HomeView() {
  const { t } = useLanguage();
  return (
    <div className={styles.home}>
      <section className={styles.hero} aria-labelledby="home-title">
        <Image
          className={styles.heroImage}
          src="/images/hero/toronto.webp"
          alt=""
          fill
          sizes="(max-width: 600px) 1400px, (max-width: 1000px) 1300px, 100vw"
          preload
        />
        <div className={styles.heroContent}>
          <p className={styles.wordmark} translate="no">
            cityora.
          </p>
          <h1 id="home-title">
            {t("Your city.")}
            <br />
            {t("Your perspective.")}
          </h1>
          <p className={styles.subtitle}>
            {t("Explore the projects and decisions shaping your community.")}
          </p>
          <form className={styles.search} action="/explore" role="search">
            <label className="sr-only" htmlFor="overview-search">
              {t("Search your community")}
            </label>
            <input
              id="overview-search"
              name="q"
              type="search"
              placeholder={t("Search neighbourhoods, projects, or topics")}
            />
            <button type="submit" aria-label={t("Search projects")}>
              <Search size={24} aria-hidden="true" />
            </button>
          </form>
        </div>
      </section>
      <section className={styles.topics} aria-labelledby="topics-title">
        <div className={styles.sectionHeading}>
          <h2 id="topics-title">{t("Explore what matters to you.")}</h2>
          <Link href="/explore">
            {t("All projects")} <ArrowUpRight size={19} aria-hidden="true" />
          </Link>
        </div>
        <div className={styles.grid}>
          {topics.map((topic) => (
            <Link
              className={styles.card}
              data-category={topic.category}
              key={topic.category}
              href={`/explore?category=${encodeURIComponent(topic.category)}`}
            >
              <Image
                src={`/images/categories/${topic.image}.webp`}
                alt=""
                fill
                sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw"
              />
              <div className={styles.cardText}>
                <h3>{t(topic.title)}</h3>
                <p>{t(topic.description)}</p>
              </div>
              <ArrowUpRight
                className={styles.cardArrow}
                size={23}
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
