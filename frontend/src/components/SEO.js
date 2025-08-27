// components/SEO.js
import Head from 'next/head';

const SEO = ({
  title = 'OPTCG Manager',
  description = 'Manage your One Piece Trading Card Game collection with ease. Track cards, build decks, and organize your TCG collection.',
  keywords = 'One Piece TCG, trading card game, card collection, deck builder, OPTCG',
  author = 'OPTCG Manager',
  url = '',
  image = '/og-image.png'
}) => {
  const siteTitle = title === 'OPTCG Manager' ? title : `${title} | OPTCG Manager`;

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />

      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="OPTCG Manager" />

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Favicon */}
      <link rel="icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />

      {/* Theme Color */}
      <meta name="theme-color" content="#4299e1" />

      {/* Robots */}
      <meta name="robots" content="index,follow" />

      {/* Canonical URL */}
      {url && <link rel="canonical" href={url} />}
    </Head>
  );
};

export default SEO;

