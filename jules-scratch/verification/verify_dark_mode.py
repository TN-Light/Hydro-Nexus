from playwright.sync_api import Page, expect

def test_dark_mode_toggle(page: Page):
    # 1. Go to the dashboard page, since the theme toggle is there.
    page.goto("http://localhost:3000/dashboard")

    # 2. Take a screenshot of the light mode.
    page.screenshot(path="jules-scratch/verification/light-mode.png")

    # 3. Find the theme toggle button and click it.
    # The button has a "Toggle theme" sr-only text.
    theme_toggle_button = page.get_by_role("button", name="Toggle theme")
    theme_toggle_button.click()

    # 4. Wait for the theme to change. I'll wait for the html to have the dark class.
    expect(page.locator("html")).to_have_attribute("class", "dark")

    # 5. Take a screenshot of the dark mode.
    page.screenshot(path="jules-scratch/verification/dark-mode.png")
