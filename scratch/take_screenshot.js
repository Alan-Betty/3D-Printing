import { chromium } from 'playwright-core'

async function run() {
  const browser = await chromium.launch({
    executablePath: '/home/john/.cache/ms-playwright/chromium-1148/chrome-linux/chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  console.log('Navigating to http://localhost:5173...')
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 15000 })

  // Check title
  console.log('Title:', await page.title())

  // Take screenshot
  const screenshotPath = '/home/john/.gemini/antigravity-ide/brain/80c37ad5-08cb-4a33-b16e-114c42a2acf8/current_ui.png'
  await page.screenshot({ path: screenshotPath, fullPage: false })
  console.log('Saved screenshot to:', screenshotPath)

  await browser.close()
}

run().catch((err) => {
  console.error('Error taking screenshot:', err)
  process.exit(1)
})
