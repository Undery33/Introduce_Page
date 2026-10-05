import Image from "next/image";
import Link from "next/link";
import { HomeIcon } from "@/components/home-icon";
import { pageMetadata } from "@/lib/metadata";
import styles from "./game-select.module.css";

export const metadata = pageMetadata(
  "Game — VALORANT & VRChat",
  "VALORANT 하이라이트 · VRChat 스토리",
  "/game",
);

export default function GamePage() {
  return (
    <div className={styles.gameGate}>
      <main className={styles.stage}>
        <h1 className="sr-only">VALORANT / VRCHAT</h1>
        <div className={styles.choices}>
          <Link
            href="/game/highlights"
            data-game="valorant"
            className={`${styles.choice} ${styles.valorant}`}
            aria-label="VALORANT 하이라이트 보기"
          >
            <div className={styles.choiceContent}>
              <div className={`${styles.gameBrand} ${styles.valorantBrand}`}>
                <Image
                  src="/images/game/valorant-logo.png"
                  alt="VALORANT"
                  width={600}
                  height={400}
                  priority
                  className={styles.valorantLogo}
                />
              </div>
              <div
                className={`${styles.portrait} ${styles.jett}`}
                aria-hidden="true"
              >
                <Image
                  src="/images/game/jett.png"
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 760px) 150vw, 85vw"
                  className={styles.character}
                />
              </div>
              <div className={`${styles.selectionCard} ${styles.valorantCard}`}>
                <h2>VALORANT</h2>
                <div className={styles.cardAction}>
                  <span>하이라이트 보기</span>
                  <span className={styles.actionArrow}>
                    <HomeIcon name="arrow-up-right" />
                  </span>
                </div>
              </div>
            </div>
          </Link>
          <Link
            href="/game/vrchat"
            data-game="vrchat"
            className={`${styles.choice} ${styles.vrchat}`}
            aria-label="VRCHAT 스토리 보기"
          >
            <div className={styles.choiceContent}>
              <div className={`${styles.gameBrand} ${styles.vrchatBrand}`}>
                <Image
                  src="/images/game/vrchat-logo.svg"
                  alt="VRCHAT"
                  width={1200}
                  height={600}
                  priority
                  className={styles.vrchatLogo}
                />
              </div>
              <div
                className={`${styles.portrait} ${styles.avatar}`}
                aria-hidden="true"
              >
                <Image
                  src="/images/game/vrchat-avatar.png"
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 760px) 100vw, 48vw"
                  className={styles.character}
                />
              </div>
              <div className={`${styles.selectionCard} ${styles.vrchatCard}`}>
                <h2>VRCHAT</h2>
                <div className={styles.cardAction}>
                  <span>스토리 보기</span>
                  <span className={styles.actionArrow}>
                    <HomeIcon name="arrow-up-right" />
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>
        <div className={styles.discordPosition}>
          <button
            className={styles.discordButton}
            type="button"
            disabled
            aria-label="Discord 연결 준비 중"
          >
            <svg
              viewBox="0 0 127.14 96.36"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M107.7 8.1A105.2 105.2 0 0 0 81.5 0a71.8 71.8 0 0 0-3.4 6.9 97.7 97.7 0 0 0-29 0A73 73 0 0 0 45.6 0 105.4 105.4 0 0 0 19.4 8.1C2.8 32.7-1.7 56.7.5 80.4a106 106 0 0 0 32.1 16c2.6-3.5 4.9-7.2 6.8-11.1a68.7 68.7 0 0 1-10.7-5.1l2.6-2a75.3 75.3 0 0 0 64.4 0l2.6 2a69.6 69.6 0 0 1-10.7 5.1c1.9 3.9 4.2 7.6 6.8 11.1a105.6 105.6 0 0 0 32.1-16c2.6-27.5-4.4-51.3-18.8-72.3ZM42.5 65.7c-6.3 0-11.5-5.8-11.5-12.9s5-12.9 11.5-12.9S54 45.7 54 52.8 48.9 65.7 42.5 65.7Zm42.1 0c-6.3 0-11.5-5.8-11.5-12.9s5-12.9 11.5-12.9 11.5 5.8 11.5 12.9-5 12.9-11.5 12.9Z" />
            </svg>
            <span>DISCORD</span>
          </button>
        </div>
      </main>
    </div>
  );
}
