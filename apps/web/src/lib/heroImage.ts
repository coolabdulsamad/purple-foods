// Hero food image. The SVG (a WebP photo wrapped in an SVG container) is stored
// as four plain-text parts so the asset can move through text-only channels
// without corruption; Vite inlines the parts at build time and we reassemble
// the SVG here into a data URI used by the Home hero <img>.
import p1 from '../assets/hero-food.part1.txt?raw'
import p2 from '../assets/hero-food.part2.txt?raw'
import p3 from '../assets/hero-food.part3.txt?raw'
import p4 from '../assets/hero-food.part4.txt?raw'

const heroSvg = p1 + p2 + p3 + p4

export const heroFoodUri = `data:image/svg+xml;base64,${btoa(heroSvg)}`
