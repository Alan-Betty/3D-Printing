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

  // Fill credentials and click sign in
  await page.fill('#g-user', 'Thulasi')
  await page.fill('#g-pass', 'Type-C')
  await page.click('button[type="submit"]')

  await page.waitForTimeout(1000)

  // 1. Dashboard Table View
  await page.screenshot({ path: '/home/john/.gemini/antigravity-ide/brain/80c37ad5-08cb-4a33-b16e-114c42a2acf8/view_table.png' })
  console.log('Saved view_table.png')

  // 2. Switch to Cards View
  const cardsBtn = page.locator('button:has-text("Cards")')
  if (await cardsBtn.count() > 0) {
    await cardsBtn.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: '/home/john/.gemini/antigravity-ide/brain/80c37ad5-08cb-4a33-b16e-114c42a2acf8/view_cards.png' })
    console.log('Saved view_cards.png')
  }

  // 3. Switch to Kanban Board View
  const boardBtn = page.locator('.hub-view-btn:has-text("Board")')
  if (await boardBtn.count() > 0) {
    await boardBtn.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: '/home/john/.gemini/antigravity-ide/brain/80c37ad5-08cb-4a33-b16e-114c42a2acf8/view_kanban.png' })
    console.log('Saved view_kanban.png')
  }

  // 4. Switch to Print Sales Ledger
  const printLedgerTab = page.locator('button:has-text("Print Sales Ledger")')
  if (await printLedgerTab.count() > 0) {
    await printLedgerTab.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: '/home/john/.gemini/antigravity-ide/brain/80c37ad5-08cb-4a33-b16e-114c42a2acf8/view_print_ledger.png' })
    console.log('Saved view_print_ledger.png')
  }

  // 5. Switch to New Order Intake
  const newOrderTab = page.locator('button:has-text("New Order Intake")')
  if (await newOrderTab.count() > 0) {
    await newOrderTab.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: '/home/john/.gemini/antigravity-ide/brain/80c37ad5-08cb-4a33-b16e-114c42a2acf8/view_new_order.png' })
    console.log('Saved view_new_order.png')
  }

  // 6. Back to Dashboard and open Order Detail Modal
  const dashTab = page.locator('button:has-text("Painting Dashboard")')
  await dashTab.click()
  await page.waitForTimeout(500)
  const inspectBtn = page.locator('button:has-text("Inspect")').first()
  if (await inspectBtn.count() > 0) {
    await inspectBtn.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: '/home/john/.gemini/antigravity-ide/brain/80c37ad5-08cb-4a33-b16e-114c42a2acf8/view_detail_modal.png' })
    console.log('Saved view_detail_modal.png')
  }

  await browser.close()
}

run().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
