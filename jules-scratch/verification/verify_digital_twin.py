from playwright.sync_api import Page, expect

def test_digital_twin_dark_mode(page: Page):
    # 1. Go to the digital twin page.
    page.goto("http://localhost:3000/digital-twin")

    # 2. Take a screenshot of the light mode.
    page.screenshot(path="jules-scratch/verification/digital-twin-light-mode.png")

    # 3. Find the theme toggle button and click it.
    theme_toggle_button = page.get_by_role("button", name="Toggle theme")
    theme_toggle_button.click()

    # 4. Wait for the theme to change.
    expect(page.locator("html")).to_have_attribute("class", "dark")

    # 5. Take a screenshot of the dark mode.
    page.screenshot(path="jules-scratch/verification/digital-twin-dark-mode.png")
