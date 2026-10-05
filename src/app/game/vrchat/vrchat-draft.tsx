"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { BrandLogo } from "@/components/brand-logo";
import { vrchatContent as content } from "./vrchat-content";
import styles from "./vrchat-draft.module.css";

// Preserve the user's feature/web draft content and presentation at this route.
const cx = (...names: string[]) => names.map((name) => styles[name]).join(" ");
type Photo = (typeof content.photos)[number];
type DialogName = "photo" | "profile" | "notice";

function photoStyle(photo: Photo, avatar = false): CSSProperties {
  return {
    backgroundImage: `url("${photo.src}")`,
    "--photo-position": avatar ? photo.avatarPosition : photo.position,
  } as CSSProperties;
}

function DraftDialog({
  children,
  onClick,
  onPointerDown,
  ...props
}: ComponentProps<"dialog">) {
  const startedOnBackdrop = useRef(false);
  const outside = (
    event:
      PointerEvent<HTMLDialogElement> | React.MouseEvent<HTMLDialogElement>,
  ) => {
    const rectangle = event.currentTarget.getBoundingClientRect();
    return (
      event.clientX < rectangle.left ||
      event.clientX > rectangle.right ||
      event.clientY < rectangle.top ||
      event.clientY > rectangle.bottom
    );
  };
  return (
    <dialog
      {...props}
      onPointerDown={(event) => {
        startedOnBackdrop.current = outside(event);
        onPointerDown?.(event);
      }}
      onClick={(event) => {
        if (startedOnBackdrop.current && outside(event))
          event.currentTarget.close();
        onClick?.(event);
      }}
    >
      {children}
    </dialog>
  );
}

function SocialIcon({ name }: { name: string }) {
  if (name === "discord") {
    return (
      <svg viewBox="0 0 127.14 96.36" aria-hidden="true">
        <path d="M107.7 8.1A105.2 105.2 0 0 0 81.5 0a71.8 71.8 0 0 0-3.4 6.9 97.7 97.7 0 0 0-29 0A73 73 0 0 0 45.6 0 105.4 105.4 0 0 0 19.4 8.1C2.8 32.7-1.7 56.7.5 80.4a106 106 0 0 0 32.1 16c2.6-3.5 4.9-7.2 6.8-11.1a68.7 68.7 0 0 1-10.7-5.1l2.6-2a75.3 75.3 0 0 0 64.4 0l2.6 2a69.6 69.6 0 0 1-10.7 5.1c1.9 3.9 4.2 7.6 6.8 11.1a105.6 105.6 0 0 0 32.1-16c2.6-27.5-4.4-51.3-18.8-72.3ZM42.5 65.7c-6.3 0-11.5-5.8-11.5-12.9s5-12.9 11.5-12.9S54 45.7 54 52.8 48.9 65.7 42.5 65.7Zm42.1 0c-6.3 0-11.5-5.8-11.5-12.9s5-12.9 11.5-12.9 11.5 5.8 11.5 12.9-5 12.9-11.5 12.9Z" />
      </svg>
    );
  }
  return (
    <span className={cx(name === "vrchat" ? "vrchat-mark" : "x-mark")}>
      {name === "vrchat" ? "VRCHAT" : "𝕏"}
    </span>
  );
}

export function VrchatDraft() {
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [noticeTitle, setNoticeTitle] = useState("");
  const [modal, setModal] = useState<DialogName | null>(null);
  const photoDialog = useRef<HTMLDialogElement>(null);
  const profileDialog = useRef<HTMLDialogElement>(null);
  const noticeDialog = useRef<HTMLDialogElement>(null);
  const allPhotos = useRef<HTMLAnchorElement>(null);
  const photoSection = useRef<HTMLElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const photo = content.photos[currentPhoto];

  useEffect(() => {
    if (!modal) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modal]);

  const openDialog = (name: DialogName) => {
    const dialog = {
      photo: photoDialog,
      profile: profileDialog,
      notice: noticeDialog,
    }[name].current;
    if (dialog && !dialog.open) dialog.showModal();
    setModal(name);
  };
  const movePhoto = (direction: number) =>
    setCurrentPhoto(
      (index) =>
        (index + direction + content.photos.length) % content.photos.length,
    );
  const openPhoto = (index: number) => {
    setCurrentPhoto(index);
    openDialog("photo");
  };
  const photoButton = (item: Photo, index: number, mini = false) => (
    <button
      key={item.src}
      className={cx("photo-button")}
      type="button"
      aria-label={`${item.description} — 사진 크게 보기`}
      onClick={() => openPhoto(index)}
    >
      <span className={cx("atlas")} style={photoStyle(item)} />
      {!mini && <span className={cx("photo-overlay")}>{item.title}</span>}
    </button>
  );

  return (
    <div className={styles.draft}>
      <a className={cx("skip-link")} href="#photos">
        사진으로 바로 가기
      </a>
      <main className={cx("page")} id="top">
        <section className={cx("hero")} aria-labelledby="site-title">
          <div className={cx("hero-ghost")} aria-hidden="true" />
          <div className={cx("edition")}>
            <span>VRCHAT AVATAR</span>
            <span>PERSONAL ARCHIVE / 01</span>
          </div>
          <p className={cx("vertical-label")} aria-hidden="true">
            THE LITTLE THINGS, THE LOVELY DAYS.
          </p>
          <h1 className={cx("hero-title")} id="site-title">
            UNDERY
          </h1>
          <div className={cx("hero-character")} aria-hidden="true">
            <Image
              src="/images/game/vrchat-avatar.png"
              alt=""
              width={941}
              height={1672}
              priority
              unoptimized
            />
          </div>
          <div className={cx("hero-motto")} aria-hidden="true">
            A<br />
            SMALL
            <br />
            PLACE
            <br />
            FOR
            <br />
            OUR
            <br />
            MOMENTS
            <span />
          </div>
          <div className={cx("about-block")}>
            <div className={cx("section-heading", "about-heading")}>
              <h2>About</h2>
              <span className={cx("rule")} />
              <span className={cx("section-index")}>01</span>
            </div>
            <p className={cx("intro")}>
              안녕하세요! 저는 <strong>Undery</strong>예요.
            </p>
            <p className={cx("intro-note")}>
              좋아하는 순간들을 차곡차곡, 이곳에.
            </p>
            <div className={cx("section-heading", "small-heading")}>
              <h3>.jpg</h3>
              <span className={cx("rule")} />
              <span className={cx("tiny-label")}>LITTLE MOMENTS</span>
            </div>
            <div className={cx("mini-photos")} id="mini-photos">
              {[2, 0].map((index) =>
                photoButton(content.photos[index], index, true),
              )}
            </div>
            <button
              type="button"
              className={cx("outline-button")}
              id="profile-button"
              onClick={() => openDialog("profile")}
            >
              프로필 보기 <span aria-hidden="true">↗</span>
            </button>
          </div>
          <span className={cx("hero-footnote")} aria-hidden="true">
            a collection of moments, made with love.
          </span>
        </section>

        <section
          className={cx("photo-section", "content-section")}
          id="photos"
          aria-labelledby="photo-heading"
          ref={photoSection}
        >
          <div className={cx("section-heading")}>
            <h2 id="photo-heading">
              Photo<span className={cx("heading-dot")}>.</span>
            </h2>
            <span className={cx("rule")} />
            <Link
              href="/game/vrchat/photo"
              className={cx("text-button")}
              id="all-photos"
              ref={allPhotos}
            >
              사진 더 보기 <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div className={cx("photo-grid")} id="photo-grid">
            {content.photos.map((item, index) => photoButton(item, index))}
          </div>
          <div className={cx("section-caption")}>
            <span>SCENES I WANT TO KEEP</span>
            <span>여섯 장의 작은 기억</span>
          </div>
        </section>

        <section
          className={cx("content-section")}
          aria-labelledby="social-heading"
        >
          <div className={cx("section-heading")}>
            <h2 id="social-heading">Group &amp; SNS</h2>
            <span className={cx("rule")} />
            <span className={cx("section-index")}>03</span>
          </div>
          <div className={cx("social-grid")} id="social-grid">
            {content.socials.map((social) => (
              <button
                key={social.name}
                className={cx("social-card")}
                type="button"
                aria-label={`${social.name} — 연결 준비 중`}
                onClick={() => {
                  setNoticeTitle(social.name);
                  openDialog("notice");
                }}
              >
                <span
                  className={cx("world-image")}
                  style={photoStyle(content.photos[social.photo])}
                />
                <span className={cx("social-icon")} aria-hidden="true">
                  <SocialIcon name={social.icon} />
                </span>
                <span className={cx("social-bottom")}>
                  <span className={cx("social-name")}>{social.name}</span>
                  <span className={cx("social-status")}>연결 준비 중</span>
                </span>
              </button>
            ))}
          </div>
          <p className={cx("social-note")}>우리의 이야기는 여기서 이어져요.</p>
        </section>

        <section
          className={cx("content-section", "thanks-section")}
          aria-labelledby="thanks-heading"
        >
          <div className={cx("section-heading")}>
            <h2 id="thanks-heading">Special Thanks</h2>
            <span className={cx("rule")} />
            <span className={cx("section-index")}>04</span>
          </div>
          <div className={cx("friends-grid")} id="friends-grid">
            {content.friends.map((friend) => (
              <div className={cx("friend")} key={friend.name}>
                <div className={cx("friend-avatar")} aria-hidden="true">
                  <span
                    className={cx("atlas")}
                    style={photoStyle(content.photos[friend.photo], true)}
                  />
                </div>
                <span className={cx("friend-name")}>{friend.name}</span>
              </div>
            ))}
          </div>
        </section>

        <section
          className={cx("content-section", "games-section")}
          aria-labelledby="games-heading"
        >
          <div className={cx("section-heading")}>
            <h2 id="games-heading">Another Game</h2>
            <span className={cx("rule")} />
            <span className={cx("section-index")}>05</span>
          </div>
          <Link
            className={cx("another-game-banner")}
            id="game-grid"
            href="/game/valorant"
            aria-label="VALORANT"
          >
            <Image
              src="/images/vrchat/valorant-banner.png"
              alt="세이지와 VALORANT 로고"
              width={971}
              height={234}
              loading="lazy"
              unoptimized
            />
          </Link>
        </section>
        <footer>
          <a
            className={cx("footer-brand")}
            href="#top"
            aria-label="Undery 맨 위로"
          >
            <BrandLogo size={40} />
            <span>© 2026</span>
          </a>
          <p>A small place for our moments.</p>
          <a className={cx("back-top")} href="#top">
            맨 위로 <span aria-hidden="true">↑</span>
          </a>
        </footer>
      </main>

      <DraftDialog
        className={cx("lightbox")}
        id="photo-dialog"
        aria-label="사진 크게 보기"
        ref={photoDialog}
        onClose={() => setModal(null)}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            movePhoto(event.key === "ArrowRight" ? 1 : -1);
          }
        }}
      >
        <div className={cx("lightbox-toolbar")}>
          <span className={cx("dialog-kicker")}>UNDERY / PHOTO ARCHIVE</span>
          <div className={cx("lightbox-tools")}>
            <a
              className={cx("original-photo")}
              id="original-photo"
              href={photo.src}
              download={photo.src.split("/").pop()}
            >
              8K 원본 저장 <span aria-hidden="true">↓</span>
            </a>
            <button
              className={cx("icon-button")}
              aria-label="사진 닫기"
              type="button"
              onClick={() => photoDialog.current?.close()}
            >
              ×
            </button>
          </div>
        </div>
        <div
          className={cx("lightbox-image", "atlas")}
          id="lightbox-image"
          role="img"
          aria-label={`${photo.title} — ${photo.description}`}
          style={photoStyle(photo)}
          onTouchStart={(event) => {
            const touch = event.changedTouches[0];
            touchStart.current = { x: touch.clientX, y: touch.clientY };
          }}
          onTouchEnd={(event) => {
            if (!touchStart.current) return;
            const touch = event.changedTouches[0];
            const deltaX = touch.clientX - touchStart.current.x;
            const deltaY = touch.clientY - touchStart.current.y;
            if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY))
              movePhoto(deltaX < 0 ? 1 : -1);
            touchStart.current = null;
          }}
        />
        <div className={cx("lightbox-bottom")}>
          <div>
            <p className={cx("lightbox-title")} id="lightbox-title">
              {photo.title}
            </p>
            <p className={cx("lightbox-subtitle")} id="lightbox-subtitle">
              {photo.description}
            </p>
          </div>
          <div className={cx("lightbox-navigation")}>
            <button
              className={cx("icon-button")}
              id="previous-photo"
              aria-label="이전 사진"
              type="button"
              onClick={() => movePhoto(-1)}
            >
              ←
            </button>
            <span id="photo-counter" aria-live="polite">
              {String(currentPhoto + 1).padStart(2, "0")} /{" "}
              {String(content.photos.length).padStart(2, "0")}
            </span>
            <button
              className={cx("icon-button")}
              id="next-photo"
              aria-label="다음 사진"
              type="button"
              onClick={() => movePhoto(1)}
            >
              →
            </button>
          </div>
        </div>
      </DraftDialog>

      <DraftDialog
        className={cx("profile-dialog")}
        id="profile-dialog"
        aria-labelledby="profile-title"
        ref={profileDialog}
        onClose={() => setModal(null)}
      >
        <button
          className={cx("icon-button", "corner-close")}
          aria-label="프로필 닫기"
          type="button"
          onClick={() => profileDialog.current?.close()}
        >
          ×
        </button>
        <div className={cx("profile-art")}>
          <Image
            src="/images/game/vrchat-avatar.png"
            width={941}
            height={1672}
            alt="원본 사진 속 금빛 화관과 헤드폰, 노란 원피스와 검은 재킷을 착용한 Undery 캐릭터"
            loading="lazy"
            unoptimized
          />
        </div>
        <div className={cx("profile-copy")}>
          <p className={cx("dialog-kicker")}>A LITTLE ABOUT ME</p>
          <h2 id="profile-title">
            Hello,
            <br /> I&apos;m Undery<span>.</span>
          </h2>
          <p>안녕하세요! 저는 Undery예요.</p>
          <p>
            예쁜 월드를 여행하고, 함께한 시간을 사진으로 남겨요. 작지만 소중한
            순간들을 이곳에서 나누고 싶어요.
          </p>
          <div className={cx("profile-tags")}>
            <span>VRChat</span>
            <span>Photography</span>
            <span>Little moments</span>
          </div>
          <button
            className={cx("outline-button")}
            id="profile-to-photos"
            type="button"
            onClick={() => {
              profileDialog.current?.close();
              allPhotos.current?.focus({ preventScroll: true });
              photoSection.current?.scrollIntoView({
                behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                  ? "instant"
                  : "smooth",
              });
            }}
          >
            사진 구경하기 <span aria-hidden="true">↗</span>
          </button>
        </div>
      </DraftDialog>

      <DraftDialog
        className={cx("notice-dialog")}
        id="notice-dialog"
        aria-labelledby="notice-title"
        ref={noticeDialog}
        onClose={() => setModal(null)}
      >
        <button
          className={cx("icon-button", "corner-close")}
          type="button"
          aria-label="안내 닫기"
          onClick={() => noticeDialog.current?.close()}
        >
          ×
        </button>
        <p className={cx("dialog-kicker")}>SEE YOU SOON</p>
        <h2 id="notice-title">{noticeTitle}</h2>
        <p id="notice-description">
          연결을 준비하고 있어요. 조금만 기다려 주세요!
        </p>
        <button
          type="button"
          className={cx("outline-button")}
          onClick={() => noticeDialog.current?.close()}
        >
          확인 <span aria-hidden="true">↗</span>
        </button>
      </DraftDialog>
    </div>
  );
}
