'use client';

import Image from 'next/image';
import { useTheme } from '@/lib/themeContext';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { BACKGROUND_STYLES } from '@/lib/themes';
import LaunchScreen from '@/components/ui/LaunchScreen';
import Link from 'next/link';
import { motion, Variants, useInView } from 'framer-motion';
import { useRef } from 'react';
import ScrollCards from '@/components/ScrollCards';

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.3, // delay between children
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

export default function Page() {
  const { theme } = useTheme();
  const isDark = theme.mode === 'dark';
  const [showSplash, setShowSplash] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
    const t = setTimeout(() => setShowSplash(false), 350);
    return () => clearTimeout(t);
  }, []);

  const features = [
  {
    id: 1,
    icon: '🚀',
    title: 'Access 300+ Premium AI Models Instantly',
    description:
      'Connect to industry-leading AI models including GPT-4, Claude 3.5 Sonnet, Gemini Pro, DeepSeek, Grok, LLaMA, and hundreds more through a single, unified interface. No need to juggle multiple accounts or platforms.',
  },
  {
    id: 2,
    icon: '🔐',
    title: 'Bank-Grade Security & Complete Privacy',
    description: 'Your API keys and conversations remain 100% private with local browser storage. Zero server uploads, zero data mining, zero compromises. Your sensitive information never leaves your device.',
  },
  {
    id: 3,
    icon: '⚡',
    title: 'Pre-Configured Professional API Keys',
    description: 'Skip the setup hassle with our built-in premium API keys. Start chatting with top-tier AI models immediately without creating accounts or managing billing across multiple services.',
  },
  {
    id: 4,
    icon: '🔄',
    title: 'Advanced Side-by-Side Model Comparison',
    description: 'Run identical prompts across multiple AI models simultaneously and compare responses in real-time. Perfect for finding the optimal model for coding, writing, analysis, or creative tasks.',
  },
  {
    id: 5,
    icon: '🌐',
    title: 'Real-Time Web Search Integration',
    description: 'Enhance AI responses with live web search capabilities. Get up-to-date information, current events, and recent data seamlessly integrated into your conversations for more accurate and relevant answers.',
  },
  {
    id: 6,
    icon: '📷',
    title: 'Advanced Vision & Image Analysis',
    description: 'Upload and analyze images, screenshots, documents, and diagrams with vision-enabled AI models. Perfect for code review, design feedback, document analysis, and visual problem-solving.',
  },
];

  const techStack = [
    { name: 'Next.js', icon: '⚛️' },
    { name: 'TypeScript', icon: '📘' },
    { name: 'Tailwind CSS', icon: '🎨' },
    { name: 'Docker', icon: '🐳' },
    { name: 'Supabase', icon: '⚡' },
    { name: 'Open Source', icon: '🔓' },
  ];

  const examplePrompts = [
    'Write a haiku about Monday mornings',
    "Explain quantum physics like I'm a golden retriever",
    'Create a marketing strategy for a sustainable fashion brand',
    'Debug this Python code and suggest improvements',
    'Generate a creative story about time travel',
    'Compare the pros and cons of different cloud providers',
  ];

  const chooseOpenFiesta = [
    {
      icon: '⚡',
      title: 'Efficiency',
      description: 'Skip managing multiple API accounts—access everything in one place',
    },
    {
      icon: '🔒',
      title: 'Security',
      description: 'Your API keys stay local—never uploaded to our servers',
    },
    {
      icon: '🎯',
      title: 'Flexibility',
      description: 'Choose built-in keys or bring your own—customize your AI experience',
    },
    {
      icon: '🌟',
      title: 'Transparent',
      description: '100% open-source, community-driven development',
    },
  ];

  const howitWorks = [
    {
      icon: '1',
      title: 'Start Chatting',
      description:
        'Use default models instantly or add your own API keys for personalized access to premium AI models',
    },
    {
      icon: '2',
      title: 'Ask Your Question',
      description:
        'From creative writing to complex coding problems—ask anything and get intelligent responses',
    },
    {
      icon: '3',
      title: 'Compare AI Responses',
      description:
        'View side-by-side results from different models to find the perfect AI for your specific needs',
    },
  ];

  return (
    <main className={cn('min-h-screen w-full relative', isDark ? 'dark' : '')}>
      {/* Background */}
      {isDark ? (
        <div
          className="fixed inset-0 z-0"
          style={{
            background:
              'linear-gradient(0deg, rgba(0,0,0,0.6), rgba(0,0,0,0.6)), radial-gradient(68% 58% at 50% 50%, #c81e3a 0%, #a51d35 16%, #7d1a2f 32%, #591828 46%, #3c1722 60%, #2a151d 72%, #1f1317 84%, #141013 94%, #0a0a0a 100%), radial-gradient(90% 75% at 50% 50%, rgba(228,42,66,0.06) 0%, rgba(228,42,66,0) 55%), radial-gradient(150% 120% at 8% 8%, rgba(0,0,0,0) 42%, #0b0a0a 82%, #070707 100%), radial-gradient(150% 120% at 92% 92%, rgba(0,0,0,0) 42%, #0b0a0a 82%, #070707 100%), radial-gradient(60% 50% at 50% 60%, rgba(240,60,80,0.06), rgba(0,0,0,0) 60%), #050505',
          }}
        />
      ) : (
        <div
          className="fixed inset-0 z-0"
          style={{
            background: `
              radial-gradient(ellipse 85% 65% at 8% 8%, rgba(175, 109, 255, 0.42), transparent 60%),
              radial-gradient(ellipse 75% 60% at 75% 35%, rgba(255, 235, 170, 0.55), transparent 62%),
              radial-gradient(ellipse 70% 60% at 15% 80%, rgba(255, 100, 180, 0.40), transparent 62%),
              radial-gradient(ellipse 70% 60% at 92% 92%, rgba(120, 190, 255, 0.45), transparent 62%),
              linear-gradient(180deg, #f7eaff 0%, #fde2ea 100%)
            `,
          }}
        />
      )}

      {/* Soft vignette for dark mode */}
      {isDark && (
        <div
          className="fixed inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%)',
            opacity: 0.95,
          }}
        />
      )}

      {/* Header */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.6, -0.05, 0.01, 0.99] }}
        className="fixed top-0 w-full z-50 backdrop-blur-md bg-black/10"
      >
        <nav className="container mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Image
              src="/Web_logo.svg"
              alt="Open Fiesta Logo"
              width={120}
              height={32}
              className="h-8 w-auto"
            />
          </div>

          {/* Desktop Navigation */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden lg:flex items-center gap-8"
          >
            <a href="#features" className="text-gray-300 hover:text-white transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-gray-300 hover:text-white transition-colors">
              How It Works
            </a>
            <a href="#tech-stack" className="text-gray-300 hover:text-white transition-colors">
              Tech Stack
            </a>
            <Link
              href="https://github.com/NiladriHazra/Open-Fiesta"
              className="text-gray-300 hover:text-white transition-colors"
            >
              GitHub
            </Link>
            <Link href="/chat">
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 0.95, 1] }}
                transition={{
                  duration: 1.2,
                  ease: 'easeOut',
                  delay: 0.5,
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-2 py-1 cursor-pointer rounded-md bg-red-950 text-red-400 border border-red-400 border-b-2 hover:brightness-150 active:opacity-75 transition-all"
              >
                Get Started
              </motion.button>
            </Link>
          </motion.div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden text-white p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="lg:hidden bg-black/90 backdrop-blur-md"
          >
            <div className="px-4 py-4 space-y-4">
              <a
                href="#features"
                className="block text-gray-300 hover:text-white transition-colors"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="block text-gray-300 hover:text-white transition-colors"
              >
                How It Works
              </a>
              <a
                href="#tech-stack"
                className="block text-gray-300 hover:text-white transition-colors"
              >
                Tech Stack
              </a>
              <Link
                href="https://github.com/NiladriHazra/Open-Fiesta"
                className="block text-gray-300 hover:text-white transition-colors"
              >
                GitHub
              </Link>
              <Link href="/chat">
                <button
                  className={`group cursor-pointer relative overflow-hidden inline-flex w-auto max-w-full text-left px-4 lg:px-6 py-3 lg:py-4 rounded-2xl text-sm lg:text-base font-medium transition-all duration-300 backdrop-blur-lg shadow-md hover:shadow-xl will-change-transform ${
                    isDark
                      ? 'text-white/85 hover:text-white bg-gradient-to-br from-black/35 via-black/25 to-black/15 border border-white/30 hover:border-white/20 ring-1 ring-red-400/10 hover:ring-red-400/20 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] hover:cursor-pointer'
                      : 'text-orange-950/80 hover:text-orange-950 bg-gradient-to-br from-orange-50/80 to-orange-100/70 border border-orange-200/70 hover:border-orange-300'
                  }`}
                >
                  Get Started
                </button>
              </Link>
            </div>
          </motion.div>
        )}
      </motion.header>

      {/* Splash Screen */}
      {showSplash && (
        <div className="fixed inset-0 z-[9999]">
          <LaunchScreen
            backgroundClass={BACKGROUND_STYLES[theme.background].className}
            dismissed={isHydrated}
          />
        </div>
      )}

      {/* Hero Section */}
      <section className="relative z-10 pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
        <div className="container mx-auto text-center max-w-7xl">
          <motion.h1
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-3xl sm:text-5xl lg:text-7xl font-bold mb-4 sm:mb-6 text-white bg-clip-text leading-tight"
          >
            Chat & Compare 300+ AI Models in One Place
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-base sm:text-xl lg:text-2xl text-gray-300 mb-8 sm:mb-12 max-w-4xl mx-auto leading-relaxed px-4"
          >
            Access top AI like OpenAI, Gemini, Claude & more—instantly, securely, and reliably.
            Built for developers, researchers, and AI enthusiasts.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center px-4"
          >
            <Link href="/chat">
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}
                whileTap={{ scale: 0.95 }}
                className={`group cursor-pointer relative overflow-hidden inline-flex w-auto max-w-full text-left px-4 lg:px-6 py-3 lg:py-4 rounded-2xl text-sm lg:text-base font-medium transition-all duration-300 backdrop-blur-lg shadow-md hover:shadow-xl will-change-transform ${
                  isDark
                    ? 'text-white/85 hover:text-white bg-gradient-to-br from-black/35 via-black/25 to-black/15 border border-white/10 hover:border-white/20 ring-1 ring-red-400/10 hover:ring-red-400/20 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] hover:cursor-pointer'
                    : 'text-orange-950/80 hover:text-orange-950 bg-gradient-to-br from-orange-50/80 to-orange-100/70 border border-orange-200/70 hover:border-orange-300'
                }`}
              >
                Try It Now - Free
              </motion.button>
            </Link>

            <Link href="https://github.com/NiladriHazra/Open-Fiesta">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto bg-black/30 backdrop-blur-sm border border-gray-600/30 text-gray-300 hover:text-white hover:bg-black/50 hover:border-white/40 px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Open Source on GitHub
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative z-10 py-12 sm:py-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-7xl">
          {/* Section Title */}
          <motion.h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-8 sm:mb-16 text-white bg-clip-text"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            How It Works
          </motion.h2>

          {/* Steps Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.3 }}
            className="grid md:grid-cols-3 gap-6 sm:gap-12"
          >
            {howitWorks.map((step, index) => (
              <motion.div
                key={index}
                variants={itemVariants} // 👈 child animation
                className="text-center group"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-950 backdrop-blur-sm border border-red-950 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:scale-110 group-hover:bg-black/60 group-hover:border-red-950 transition-all">
                  <span className="text-2xl sm:text-3xl font-bold text-white">{step.icon}</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-white">
                  {step.title}
                </h3>
                <p className="text-gray-300 leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Key Features */}
      {/* <section id="features" className="relative z-10 py-12 sm:py-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-7xl">
          <h2
            
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-8 sm:mb-16 bg-clip-text text-white"
          >
            Powerful Features
          </h2>
          
          <div className="snap-y snap-mandatory overflow-y-auto flex gap-6 sm:gap-8 px-2 py-4">
            {features.map((feature, index) => (
              <div key={index}
                
                className="bg-black/20 snap-center backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8 transition-all group cursor-pointer"
              >
                <div className="text-3xl sm:text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-white">
                  {feature.title}
                </h3>
                <p className="text-gray-300 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      <section id="features" className="relative z-10 py-12 sm:py-20 px-4 sm:px-6">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center bg-clip-text text-white">
          Powerful Features
        </h2>
        <ScrollCards features={features} />
      </section>

      {/* Example Prompts */}
      <section className="relative z-10 py-12 sm:py-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-7xl">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-8 sm:mb-16 bg-clip-text text-white"
          >
            Try These Prompts
          </motion.h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {examplePrompts.map((prompt, index) => (
              <div
                key={index}
                className="bg-black/20 hover:scale-105 backdrop-blur-sm border border-purple-500/20 rounded-xl p-4 sm:p-6 hover:bg-black/30 hover:border-red-900 transition-all cursor-pointer group"
              >
                <p className="text-gray-200 group-hover:text-white transition-colors text-sm sm:text-base">
                  "{prompt}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section id="tech-stack" className="relative z-10 py-12 sm:py-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-7xl">
          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-8 sm:mb-16 bg-clip-text text-white"
          >
            Built with Modern Tech
          </motion.h2>

          {/* Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.2 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-8"
          >
            {techStack.map((tech, index) => (
              <motion.div
                key={index}
                variants={itemVariants} // 👈 Animate each card
                className="text-center group"
              >
                <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-2xl p-4 sm:p-6 hover:bg-black/30 transition-all hover:border-white/20 group-hover:scale-105">
                  <div className="text-2xl sm:text-3xl mb-2 sm:mb-4">{tech.icon}</div>
                  <h3 className="text-sm sm:text-base font-semibold text-white">{tech.name}</h3>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="relative z-10 py-12 sm:py-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-7xl">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-8 sm:mb-16 bg-clip-text text-white"
          >
            Why Choose Open Fiesta?
          </motion.h2>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.2 }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8"
          >
            {chooseOpenFiesta.map((benefit, index) => (
              <motion.div className="text-center" key={index} variants={itemVariants}>
                <div className="w-16 h-16 bg-black/40 backdrop-blur-sm border border-yellow-500/30 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <span className="text-2xl">{benefit.icon}</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{benefit.title}</h3>
                <p className="text-gray-300 text-sm sm:text-base">{benefit.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* GitHub Stats & CTA */}
      <section className="relative z-10 py-12 sm:py-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-12">
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 bg-clip-text text-white"
            >
              Join the Community
            </motion.h2>
            <p className="text-lg sm:text-xl text-gray-300 mb-6 sm:mb-8">
              Open Fiesta has gained{' '}
              <span className="text-orange-400 font-semibold">892 stars</span> and{' '}
              <span className="text-blue-400 font-semibold">165 forks</span> from developers
              worldwide
            </p>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link href="/chat">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-black/40 cursor-pointer backdrop-blur-sm border border-red-900 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold hover:bg-black/60 hover:border-red-800 hover:shadow-2xl hover:shadow-red-800 transition-all transform hover:scale-105 text-base sm:text-lg"
                >
                  Start Your First Chat
                </motion.button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 sm:py-12 px-4 sm:px-6 border-t border-white/10">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <Image
                src="/Web_logo.svg"
                alt="Open Fiesta Logo"
                width={100}
                height={26}
                className="h-6 w-auto"
              />
              <span className="text-gray-400 text-sm">Open Source AI Chat Platform</span>
            </div>
            <div className="flex gap-6 text-sm">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Privacy
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Terms
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Docs
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                Support
              </a>
            </div>
          </div>
          <div className="text-center mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-white/5">
            <p className="text-gray-500 text-sm">
              &copy; 2025 Open Fiesta. Built with ❤️ by the community.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
