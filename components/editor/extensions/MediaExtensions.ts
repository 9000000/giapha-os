import { Node, mergeAttributes } from '@tiptap/core';

export const Iframe = Node.create({
  name: 'iframe',
  group: 'block',
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'w-full aspect-video rounded-xl border border-stone-200 shadow-sm my-4',
      },
    };
  },

  addAttributes() {
    return {
      src: { default: null },
      frameborder: { default: 0 },
      allowfullscreen: { default: null },
      allow: { default: null },
      width: { default: '100%' },
      height: { default: '100%' },
      title: { default: null },
      loading: { default: null },
      referrerpolicy: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'iframe' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { class: 'relative w-full aspect-video my-4 rounded-xl overflow-hidden border border-stone-200 shadow-sm' }, 
      ['iframe', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)]
    ];
  },
});

export const Source = Node.create({
  name: 'source',
  group: 'videoItems',
  atom: true,
  addAttributes() {
    return {
      src: { default: null },
      type: { default: null },
    };
  },
  parseHTML() { return [{ tag: 'source' }]; },
  renderHTML({ HTMLAttributes }) { return ['source', HTMLAttributes]; }
});

export const Track = Node.create({
  name: 'track',
  group: 'videoItems',
  atom: true,
  addAttributes() {
    return {
      src: { default: null },
      kind: { default: null },
      srclang: { default: null },
      label: { default: null },
      default: { default: null },
    };
  },
  parseHTML() { return [{ tag: 'track' }]; },
  renderHTML({ HTMLAttributes }) { return ['track', HTMLAttributes]; }
});

export const VideoHtml = Node.create({
  name: 'video',
  group: 'block',
  content: 'videoItems*',
  addAttributes() {
    return {
      src: { default: null },
      controls: { default: true },
      width: { default: '100%' },
      height: { default: 'auto' },
      autoplay: { default: null },
      loop: { default: null },
      muted: { default: null },
      poster: { default: null },
      preload: { default: null },
    };
  },
  parseHTML() { return [{ tag: 'video' }]; },
  renderHTML({ HTMLAttributes }) {
    return ['video', mergeAttributes({ controls: true, class: 'w-full rounded-xl object-cover my-4 border border-stone-200 shadow-sm' }, HTMLAttributes), 0];
  }
});
