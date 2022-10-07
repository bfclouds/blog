import { defineUserConfig, defaultTheme } from 'vuepress'
import { navbar } from './config/navBar'

export default defineUserConfig({
  base: '/blog/',
  lang: 'zh-CN',
  title: '老付不老',
  description: '学习笔记和项目复盘',
  theme: defaultTheme({
    navbar: navbar
  }),
  repo: 'https://gitlab.com/bfclouds',
})