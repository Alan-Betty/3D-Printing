import { chromium } from 'playwright-core'

async function run() {
  const browser = await chromium.launch({
    executablePath: '/home/john/.cache/ms-playwright/chromium-1148/chrome-linux/chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } })
  const page = await context.newPage()

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 15000 })
  await page.fill('#g-user', 'Thulasi')
  await page.fill('#g-pass', 'Type-C')
  await page.click('button[type="submit"]')
  await page.waitForSelector('.clean-table, .kanban-board', { timeout: 10000 })

  const cardsBtn = page.locator('.hub-view-btn:has-text("Cards")')
  if (await cardsBtn.count() > 0) {
    await cardsBtn.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: '/home/john/.gemini/antigravity-ide/brain/80c37ad5-08cb-4a33-b16e-114c42a2acf8/view_cards_loaded.png' })
    console.log('Saved view_cards_loaded.png')
  }

  await browser.close()
}

run().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
