import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { HomeIcon } from "@/components/home-icon";
import { homeDestinations, homeSocials } from "@/lib/home";
import styles from "./home.module.css";

const description =
  "안될 땐 처음부터 다시. UNDERY의 소개, 함께 즐기는 게임, 코딩과 배움의 기록을 만나는 공간입니다.";
export const metadata: Metadata = {
  title: "UNDERY — 안될 땐 처음부터 다시",
  description,
  alternates: { canonical: "/" },
  openGraph: {
    title: "UNDERY — 안될 땐 처음부터 다시",
    description,
    url: "/",
    locale: "ko_KR",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
};

export default function RootPage() {
  return (
    <div className={styles.home}>
      <a className={styles.skipLink} href="#destinations">
        페이지 선택으로 건너뛰기
      </a>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/" className={styles.brand} aria-label="UNDERY 홈">
            <BrandLogo alt="" />
            <span>undery.link</span>
          </Link>
          <span className={styles.headerNote}>A PERSONAL SPACE</span>
          <a href="#connect" className={styles.contactLink}>
            <span>연결하기</span>
            <HomeIcon name="arrow-down" />
          </a>
        </header>
        <main>
          <section className={styles.hero} aria-labelledby="home-title">
            <p className={styles.eyebrow}>
              <span className={styles.spark} aria-hidden="true">
                ✳
              </span>
              ALWAYS A NEW BEGINNING
            </p>
            <h1 id="home-title" className={styles.wordmark}>
              UNDERY
            </h1>
            <div className={styles.introduction}>
              <h2>안될 땐 처음부터 다시.</h2>
              <p>
                막히면 잠시 멈추고, 처음부터 차근차근.
                <br />
                UNDERY는 다시 시작하는 마음을 담은 이름입니다.
              </p>
            </div>
          </section>
          <section
            id="destinations"
            className={styles.destinations}
            aria-labelledby="destination-title"
            tabIndex={-1}
          >
            <div className={styles.sectionLabel}>
              <h2 id="destination-title">어떤 이야기가 궁금한가요?</h2>
              <span>
                CHOOSE YOUR NEXT CHAPTER <HomeIcon name="arrow-down" />
              </span>
            </div>
            <div className={styles.cardGrid}>
              {homeDestinations.map((destination, index) => (
                <Link
                  key={destination.path}
                  href={destination.path}
                  className={styles.card}
                >
                  <div className={styles.cardTop}>
                    <span className={styles.cardIndex}>
                      0{index + 1} / {destination.label}
                    </span>
                    <HomeIcon
                      name={destination.icon}
                      className={styles.cardIcon}
                    />
                  </div>
                  <h3>{destination.title}</h3>
                  <p>{destination.description}</p>
                  <div className={styles.cardBottom}>
                    <span>{destination.path}</span>
                    <span className={styles.cardArrow}>
                      <HomeIcon name="arrow-up-right" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
          <section
            id="connect"
            className={styles.connect}
            aria-labelledby="connect-title"
          >
            <div className={styles.connectHeading}>
              <h2 id="connect-title">다른 곳에서도 만나요.</h2>
              <p id="social-status">SNS와 메일은 곧 연결할게요.</p>
            </div>
            <div className={styles.socialLinks}>
              {homeSocials.map((social) =>
                social.href ? (
                  <a
                    key={social.name}
                    href={social.href}
                    className={styles.socialLink}
                    target={
                      social.href.startsWith("https:") ? "_blank" : undefined
                    }
                    rel={
                      social.href.startsWith("https:")
                        ? "noopener noreferrer"
                        : undefined
                    }
                    aria-label={`${social.name}${social.href.startsWith("https:") ? " (새 탭)" : ""}`}
                  >
                    <HomeIcon name={social.icon} />
                    <span>{social.name}</span>
                    <HomeIcon
                      name="arrow-up-right"
                      className={styles.socialArrow}
                    />
                  </a>
                ) : (
                  <button
                    key={social.name}
                    type="button"
                    className={styles.socialLink}
                    disabled
                    aria-label={`${social.name} (준비 중)`}
                    aria-describedby="social-status"
                    title={`${social.name} · 준비 중`}
                  >
                    <HomeIcon name={social.icon} />
                    <span>{social.name}</span>
                  </button>
                ),
              )}
            </div>
          </section>
        </main>
        <footer className={styles.footer}>
          <span className={styles.footerBrand}>
            <BrandLogo size={28} alt="" />
            <span>© {new Date().getFullYear()} UNDERY</span>
          </span>
          <span className={styles.footerMotto}>
            RESET. RESTART. REPEAT. <HomeIcon name="restart" />
          </span>
          <span>나의 속도로, 계속.</span>
        </footer>
      </div>
    </div>
  );
}
