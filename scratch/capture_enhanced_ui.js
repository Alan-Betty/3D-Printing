import { chromium } from 'playwright-core'

async function run() {
  const browser = await chromium.launch({
    executablePath: '/home/john/.cache/ms-playwright/chromium-1148/chrome-linux/chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } })
  const page = await context.newPage()

  const outDir = '/home/john/.gemini/antigravity-ide/brain/80c37ad5-08cb-4a33-b16e-114c42a2acf8'

  // 1. Login Screen
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 15000 })
  // Clear any existing localStorage session so we see the enhanced login screen
  await page.evaluate(() => {
    localStorage.removeItem('layerledger_operator_logged_in')
    localStorage.removeItem('layerledger_sandbox_session')
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${outDir}/enhanced_login.png` })
  console.log('Saved enhanced_login.png')

  // Click quick demo chip
  const demoChip = page.locator('.gate-demo-chip')
  if (await demoChip.count() > 0) {
    await demoChip.click()
  } else {
    await page.fill('#g-user', 'Thulasi')
    await page.fill('#g-pass', 'Type-C')
    await page.click('button[type="submit"]')
  }

  // Wait for table to load
  await page.waitForSelector('.clean-table, .order-card', { timeout: 10000 })
  await page.waitForTimeout(800)

  // 2. Table View
  await page.screenshot({ path: `${outDir}/enhanced_table.png` })
  console.log('Saved enhanced_table.png')

  // 3. Cards View
  const cardsBtn = page.locator('.hub-view-btn:has-text("Cards")')
  if (await cardsBtn.count() > 0) {
    await cardsBtn.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${outDir}/enhanced_cards.png` })
    console.log('Saved enhanced_cards.png')
  }

  // 4. Kanban View
  const boardBtn = page.locator('.hub-view-btn:has-text("Board")')
  if (await boardBtn.count() > 0) {
    await boardBtn.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${outDir}/enhanced_kanban.png` })
    console.log('Saved enhanced_kanban.png')
  }

  // 5. Print Sales Ledger (Delivered Orders & Z-Axis)
  const ledgerTab = page.locator('.mode-tab:has-text("Print Sales Ledger")')
  if (await ledgerTab.count() > 0) {
    await ledgerTab.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${outDir}/enhanced_print_ledger.png` })
    console.log('Saved enhanced_print_ledger.png')
  }

  // 6. New Order Intake
  const newOrderTab = page.locator('.mode-tab:has-text("New Order Intake")')
  if (await newOrderTab.count() > 0) {
    await newOrderTab.click()
    await page.waitForTimeout(500)
    // Type something in item and customer to see live preview
    await page.fill('#new-item', 'Cyberpunk Katana')
    await page.fill('#new-customer', 'Elena Rostova')
    await page.fill('#new-contact', '+91 98765 12345')
    await page.fill('#new-price', '1850')
    await page.fill('#new-weight', '42')
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${outDir}/enhanced_new_order.png` })
    console.log('Saved enhanced_new_order.png')
  }

  // 7. Back to Dashboard -> Detail Modal
  const dashTab = page.locator('.mode-tab:has-text("Painting Dashboard")')
  await dashTab.click()
  await page.waitForTimeout(500)
  // Ensure table view
  const tableBtn = page.locator('.hub-view-btn:has-text("Table")')
  if (await tableBtn.count() > 0) await tableBtn.click()
  await page.waitForTimeout(400)

  const inspectBtn = page.locator('.btn-inspect').first()
  if (await inspectBtn.count() > 0) {
    await inspectBtn.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${outDir}/enhanced_detail_modal.png` })
    console.log('Saved enhanced_detail_modal.png')
    // Close detail modal
    await page.click('.sheet-x')
    await page.waitForTimeout(300)
  }

  // 8. Edit Modal
  const editBtn = page.locator('.btn-edit').first()
  if (await editBtn.count() > 0) {
    await editBtn.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${outDir}/enhanced_edit_modal.png` })
    console.log('Saved enhanced_edit_modal.png')
  }

  await browser.close()
}

run().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
