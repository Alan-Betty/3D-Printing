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

  // Wait for data to load
  await page.waitForSelector('.clean-table, .kanban-board', { timeout: 10000 })
  await page.waitForTimeout(1000)

  // Ensure table view is selected
  const tableBtn = page.locator('.hub-view-btn:has-text("Table")')
  if (await tableBtn.count() > 0) {
    await tableBtn.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: '/home/john/.gemini/antigravity-ide/brain/80c37ad5-08cb-4a33-b16e-114c42a2acf8/view_table_loaded.png' })
    console.log('Saved view_table_loaded.png')
  }

  // Open Edit Modal on first item
  const editBtn = page.locator('.clean-btn-edit').first()
  if (await editBtn.count() > 0) {
    await editBtn.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: '/home/john/.gemini/antigravity-ide/brain/80c37ad5-08cb-4a33-b16e-114c42a2acf8/view_edit_modal.png' })
    console.log('Saved view_edit_modal.png')
  }

  await browser.close()
}

run().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
