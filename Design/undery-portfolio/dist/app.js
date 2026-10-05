'use strict';
(() => {
  const content = window.SITE_CONTENT;
  const select = (selector) => document.querySelector(selector);
  const create = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const positionPhoto = (element, photo) => {
    element.style.backgroundImage = `url("${photo.src}")`;
    element.style.setProperty('--photo-position', photo.position || 'center');
  };
  const atlas = (photo) => {
    const element = create('span', 'atlas');
    positionPhoto(element, photo);
    return element;
  };

  let currentPhoto = 0;
  const photoDialog = select('#photo-dialog');
  const showPhoto = (index) => {
    currentPhoto = (index + content.photos.length) % content.photos.length;
    const photo = content.photos[currentPhoto];
    positionPhoto(select('#lightbox-image'), photo);
    select('#lightbox-image').setAttribute('aria-label', `${photo.title} — ${photo.description}`);
    select('#original-photo').href = photo.src;
    select('#original-photo').download = photo.src.split('/').pop();
    select('#lightbox-title').textContent = photo.title;
    select('#lightbox-subtitle').textContent = photo.description;
    select('#photo-counter').textContent = `${String(currentPhoto + 1).padStart(2, '0')} / ${String(content.photos.length).padStart(2, '0')}`;
  };
  const openDialog = (dialog) => {
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('modal-open');
  };
  const openPhoto = (index) => {
    showPhoto(index);
    openDialog(photoDialog);
  };
  const photoButton = (photo, index, mini = false) => {
    const button = create('button', 'photo-button');
    button.type = 'button';
    button.setAttribute('aria-label', `${photo.description} — 사진 크게 보기`);
    button.append(atlas(photo));
    if (!mini) button.append(create('span', 'photo-overlay', photo.title));
    button.addEventListener('click', () => openPhoto(index));
    return button;
  };
  content.photos.forEach((photo, index) => select('#photo-grid').append(photoButton(photo, index)));
  [2, 0].forEach((index) => select('#mini-photos').append(photoButton(content.photos[index], index, true)));
  select('#all-photos').addEventListener('click', () => openPhoto(0));
  select('#previous-photo').addEventListener('click', () => showPhoto(currentPhoto - 1));
  select('#next-photo').addEventListener('click', () => showPhoto(currentPhoto + 1));
  photoDialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      showPhoto(currentPhoto + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  let touchStart = null;
  select('#lightbox-image').addEventListener('touchstart', (event) => {
    touchStart = { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
  }, { passive: true });
  select('#lightbox-image').addEventListener('touchend', (event) => {
    if (!touchStart) return;
    const deltaX = event.changedTouches[0].clientX - touchStart.x;
    const deltaY = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) showPhoto(currentPhoto + (deltaX < 0 ? 1 : -1));
    touchStart = null;
  }, { passive: true });

  document.querySelectorAll('dialog').forEach((dialog) => {
    dialog.querySelectorAll('.close-dialog').forEach((button) => button.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('close', () => {
      if (!document.querySelector('dialog[open]')) document.body.classList.remove('modal-open');
    });
    let startedOnBackdrop = false;
    const outside = (event) => {
      const rectangle = dialog.getBoundingClientRect();
      return event.clientX < rectangle.left || event.clientX > rectangle.right || event.clientY < rectangle.top || event.clientY > rectangle.bottom;
    };
    dialog.addEventListener('pointerdown', (event) => { startedOnBackdrop = outside(event); });
    dialog.addEventListener('click', (event) => { if (startedOnBackdrop && outside(event)) dialog.close(); });
  });
  select('#profile-button').addEventListener('click', () => openDialog(select('#profile-dialog')));
  select('#profile-to-photos').addEventListener('click', () => {
    select('#profile-dialog').close();
    select('#all-photos').focus({ preventScroll: true });
    select('#photos').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  });

  const safeExternalUrl = (input) => {
    try { const url = new URL(input); return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null; }
    catch { return null; }
  };
  const discordIcon = '<svg viewBox="0 0 127.14 96.36" aria-hidden="true"><path d="M107.7 8.1A105.2 105.2 0 0 0 81.5 0a71.8 71.8 0 0 0-3.4 6.9 97.7 97.7 0 0 0-29 0A73 73 0 0 0 45.6 0 105.4 105.4 0 0 0 19.4 8.1C2.8 32.7-1.7 56.7.5 80.4a106 106 0 0 0 32.1 16c2.6-3.5 4.9-7.2 6.8-11.1a68.7 68.7 0 0 1-10.7-5.1l2.6-2a75.3 75.3 0 0 0 64.4 0l2.6 2a69.6 69.6 0 0 1-10.7 5.1c1.9 3.9 4.2 7.6 6.8 11.1a105.6 105.6 0 0 0 32.1-16c2.6-27.5-4.4-51.3-18.8-72.3ZM42.5 65.7c-6.3 0-11.5-5.8-11.5-12.9s5-12.9 11.5-12.9S54 45.7 54 52.8 48.9 65.7 42.5 65.7Zm42.1 0c-6.3 0-11.5-5.8-11.5-12.9s5-12.9 11.5-12.9 11.5 5.8 11.5 12.9-5 12.9-11.5 12.9Z"/></svg>';
  content.socials.forEach((social) => {
    const url = safeExternalUrl(social.url);
    const card = create(url ? 'a' : 'button', 'social-card');
    if (url) { card.href = url; card.target = '_blank'; card.rel = 'noopener noreferrer'; }
    else {
      card.type = 'button';
      card.addEventListener('click', () => {
        select('#notice-title').textContent = social.name;
        select('#notice-description').textContent = '연결을 준비하고 있어요. 조금만 기다려 주세요!';
        openDialog(select('#notice-dialog'));
      });
    }
    card.setAttribute('aria-label', `${social.name}${url ? ' 새 탭에서 열기' : ' — 연결 준비 중'}`);
    const background = create('span', 'world-image');
    positionPhoto(background, content.photos[social.photo]);
    const icon = create('span', 'social-icon');
    if (social.icon === 'discord') icon.innerHTML = discordIcon;
    else icon.append(create('span', social.icon === 'vrchat' ? 'vrchat-mark' : 'x-mark', social.icon === 'vrchat' ? 'VRCHAT' : '𝕏'));
    icon.setAttribute('aria-hidden', 'true');
    const bottom = create('span', 'social-bottom');
    bottom.append(create('span', 'social-name', social.name), create('span', url ? 'social-arrow' : 'social-status', url ? '↗' : '연결 준비 중'));
    card.append(background, icon, bottom);
    select('#social-grid').append(card);
  });
  content.friends.forEach((friend) => {
    const element = create('div', 'friend');
    const avatar = create('div', 'friend-avatar');
    avatar.setAttribute('aria-hidden', 'true');
    const portrait = atlas(content.photos[friend.photo]);
    portrait.style.setProperty('--photo-position', content.photos[friend.photo].avatarPosition || 'center');
    avatar.append(portrait);
    element.append(avatar, create('span', 'friend-name', friend.name));
    select('#friends-grid').append(element);
  });
  content.games.forEach((game, index) => {
    const card = create('article', 'game-card');
    const background = create('div', 'world-image');
    positionPhoto(background, content.photos[game.photo]);
    background.setAttribute('role', 'img');
    background.setAttribute('aria-label', game.description);
    const info = create('div', 'game-info');
    const text = create('div');
    text.append(create('h3', '', game.name), create('p', '', '준비 중'));
    info.append(text, create('span', 'game-number', `0${index + 1}`));
    card.append(background, info);
    select('#game-grid').append(card);
  });
})();
