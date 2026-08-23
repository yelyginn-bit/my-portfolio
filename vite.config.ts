import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, type HtmlTagDescriptor} from 'vite';

const sharedHeadAssets = (metrikaId: string, gaId: string) => ({
  name: 'shared-head-assets',
  transformIndexHtml(html: string) {
    const isReactPage = html.includes('<div id="root"');
    const tags: HtmlTagDescriptor[] = [
      { tag: 'link', attrs: { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }, injectTo: 'head' },
      { tag: 'link', attrs: { rel: 'manifest', href: '/site.webmanifest' }, injectTo: 'head' },
      { tag: 'meta', attrs: { name: 'theme-color', content: '#f4f4ef' }, injectTo: 'head' },
      { tag: 'meta', attrs: { property: 'og:image', content: 'https://yelyginn.ru/og-cover.jpg' }, injectTo: 'head' },
      { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' }, injectTo: 'head' },
      { tag: 'meta', attrs: { property: 'og:image:height', content: '630' }, injectTo: 'head' },
      { tag: 'meta', attrs: { property: 'og:image:alt', content: 'Юрий Елыгин — оператор, монтаж, цвет и live production' }, injectTo: 'head' },
      { tag: 'meta', attrs: { name: 'twitter:image', content: 'https://yelyginn.ru/og-cover.jpg' }, injectTo: 'head' },
      { tag: 'script', attrs: { src: '/cookie-consent.js', defer: true }, injectTo: 'body' },
    ];
    if (!html.includes('property="og:type"')) tags.push({ tag: 'meta', attrs: { property: 'og:type', content: 'website' }, injectTo: 'head' });
    if (!html.includes('property="og:site_name"')) tags.push({ tag: 'meta', attrs: { property: 'og:site_name', content: 'YELYGINN' }, injectTo: 'head' });
    if (!html.includes('property="og:locale"')) tags.push({ tag: 'meta', attrs: { property: 'og:locale', content: 'ru_RU' }, injectTo: 'head' });
    if (!html.includes('name="twitter:card"')) tags.push({ tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' }, injectTo: 'head' });
    if (!isReactPage) {
      tags.push({
        tag: 'script',
        attrs: {
          src: '/static-analytics.js',
          defer: true,
          'data-metrika-id': metrikaId,
          'data-ga-id': gaId,
        },
        injectTo: 'body',
      });
      tags.push({
        tag: 'script',
        attrs: {
          src: '/site-shell.js',
          defer: true,
        },
        injectTo: 'body',
      });
    }
    return {
      html,
      tags,
    };
  },
});

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    // Vercel's Supabase integration provisions browser-safe values with the
    // NEXT_PUBLIC_ prefix. Keep server-only SUPABASE_* values out of the bundle.
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    plugins: [
      react(),
      tailwindcss(),
      sharedHeadAssets(env.VITE_YANDEX_METRIKA_ID || '', env.VITE_GA_ID || ''),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          photo: path.resolve(__dirname, 'photo.html'),
          portfolio: path.resolve(__dirname, 'portfolio.html'),
          portfolioReels: path.resolve(__dirname, 'portfolio-reels.html'),
          portfolioEvents: path.resolve(__dirname, 'portfolio-events.html'),
          portfolioConcerts: path.resolve(__dirname, 'portfolio-concerts.html'),
          portfolioPhoto: path.resolve(__dirname, 'portfolio-photo.html'),
          portfolioEditing: path.resolve(__dirname, 'portfolio-editing.html'),
          project: path.resolve(__dirname, 'project.html'),
          contentDay: path.resolve(__dirname, 'content-day.html'),
          calculator: path.resolve(__dirname, 'calculator.html'),
          account: path.resolve(__dirname, 'account.html'),
          admin: path.resolve(__dirname, 'admin.html'),
          gallery: path.resolve(__dirname, 'gallery.html'),
          cases: path.resolve(__dirname, 'cases.html'),
          journal: path.resolve(__dirname, 'journal.html'),
          prices: path.resolve(__dirname, 'ceny.html'),
          eventVideo: path.resolve(__dirname, 'event-video.html'),
          colorGrading: path.resolve(__dirname, 'cvetokorrekciya.html'),
          reels: path.resolve(__dirname, 'reels.html'),
          advertising: path.resolve(__dirname, 'reklamnye-roliki.html'),
          marketplace: path.resolve(__dirname, 'video-dlya-marketpleysov.html'),
          broadcast: path.resolve(__dirname, 'pryamye-translyacii.html'),
          blog: path.resolve(__dirname, 'blog/index.html'),
          blogReels: path.resolve(__dirname, 'blog/kak-snimat-reels-dlya-biznesa.html'),
          blogPrice: path.resolve(__dirname, 'blog/skolko-stoit-snyat-reklamnyy-rolik.html'),
          blogMarketplace: path.resolve(__dirname, 'blog/video-dlya-kartochek-wildberries.html'),
          blogEvents: path.resolve(__dirname, 'blog/videosemka-meropriyatiy-nn.html'),
          legal: path.resolve(__dirname, 'legal.html'),
          caseDetail: path.resolve(__dirname, 'case.html'),
        },
      },
    },
    server: {
      // HMR is disabled when the DISABLE_HMR environment variable is set.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Прокси serverless-функций (api/) на локальный сервер функций в dev.
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});
