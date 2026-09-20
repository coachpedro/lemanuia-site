# lemanuia-site

The Le Manuia website. Plain HTML — no build step, no npm install, nothing to
compile. What is in this folder is exactly what gets served.

The site is currently **behind a password page.**

---

## The files

| File | What it is |
|---|---|
| `index.html` | The **password page**. This is what the public sees at lemanuia.org. |
| `site.html` | The **actual site** — programs, impact, accountability, contact. Everything you had before. |
| `set-password.mjs` | A small tool for changing the password. Only needed when you want to change it. |
| `robots.txt` | Instructions for Google. Read the comments in it before changing it. |
| `share-card.png` | The picture that shows up when someone pastes a link to the site into email, a text message, Slack or Facebook. |
| `build-card.py` | Redraws `share-card.png`. Only needed if the logo changes — see below. |
| `logo-cream.png`, `symbol-lagoon.png`, `favicon.png` | Images. Both pages use them. |

**The one thing to remember: your site content lives in `site.html` now.**
`index.html` is just the password page. If you go to edit the site and find
yourself looking at a password form, you have the wrong file open.

## Editing the site

Same as before, just in `site.html`:

1. Open `site.html` here on GitHub.
2. Click the pencil icon.
3. Make your change and commit it.

The site updates in a minute or two. Nothing else needs doing.

There is one block at the very top of `site.html`, above the `<title>` line,
that is not part of the site — it is the bit that sends people to the password
page. It is marked with a comment saying so. Leave it alone and edit anything
below it freely.

## Changing the password

The password is not stored anywhere in this repository — not in any file, not
in the history. What is stored is a scrambled version of it that cannot be
turned back into the password. So there is no way to look it up. If you forget
it, you set a new one.

To set a new one you need Node.js on your computer (nodejs.org, the "LTS"
download). Then, in this folder:

```
node set-password.mjs --write
```

It asks for the new password twice, then updates `index.html` for you. Commit
the change and the new password is live.

Two other things it can do:

```
node set-password.mjs           # shows the new lines but changes nothing
node set-password.mjs --check   # tells you whether a password is the current one
```

`--check` is the useful one when you are not sure whether you are misremembering
the password or something is broken.

If you would rather not install anything, ask whoever helps you with the site
to run it — they do not need the old password to set a new one.

## The share picture

`share-card.png` is what email, iMessage, Slack, Facebook and LinkedIn show
when someone pastes a link to the site. It is the logo on the lagoon
background, and it is already wired into both pages.

You only need to touch it if the logo changes. Then, with Python and Pillow
installed (`pip install Pillow`):

```
python3 build-card.py
```

That redraws the card from `logo-cream.png` and `symbol-lagoon.png` and
overwrites `share-card.png`. Commit the new file.

One catch worth knowing: the pages point at the card by its full web address,
`https://lemanuia.org/share-card.png`, because Facebook and the rest fetch it
from their own servers and a short path like `share-card.png` means nothing to
them. If the site ever moves to a different domain, those addresses have to
move with it — they are in the `og:image` and `og:url` lines near the top of
both `index.html` and `site.html`.

Link previews are cached hard by every one of these services. If you change the
card and an old one keeps appearing, that is their cache, not your site.

## Taking the password page down when you launch

Two steps, both doable in the GitHub web editor:

1. Open `site.html`. Delete the marked block at the top — the comment, the
   `<meta name="robots" content="noindex">` line, the `<style>` line and the
   `<script>` block that follows it. Everything from `<title>` down stays.
2. Rename `site.html` to `index.html`, replacing the password page.

`robots.txt` can stay exactly as it is. You can delete `set-password.mjs` at
that point, or leave it — it does nothing on its own.

If you would rather keep the old password page around for later, rename it to
something like `holding.html` first instead of letting it be overwritten.

---

## What this password page actually protects

Worth being straight about, because it changes what you should put on the site.

**What it does.** It keeps the site out of Google, and it stops anyone who
turns up at lemanuia.org from reading it. That covers the ordinary case: a
funder who has not been sent the link, someone searching your org's name, a
parent who heard about you early. For "we are not ready to be seen yet," it
works.

**What it does not do.** This is a curtain, not a lock. The site is a plain
file sitting on a public web server, and the password is checked in the
visitor's own browser rather than by a server that could refuse to hand the
page over. Which means:

- Anyone who knows or guesses the address `lemanuia.org/site.html` gets the
  page directly, without ever seeing the password form.
- Anyone who knows how to look can read the page's source or switch off
  JavaScript and see the content anyway.

Neither takes any skill. They just take knowing to try, which most people do
not.

**So:** treat everything in `site.html` as publishable. That is fine as things
stand — the EIN, the UBI number and the mailing address on that page are all
public record already, filed with the IRS and the Washington Secretary of
State, and the phone number and email are ones you hand out. Nothing on the
site today would be a problem if it leaked tomorrow.

The rule to carry forward: **do not add anything to `site.html` that would
actually hurt if a stranger read it** — no family names or photos of kids
without permission, no home addresses, no bank or grant details, no board
documents. If you ever need to host something like that, it needs a real login,
which needs something other than GitHub Pages.

**Give the password out freely to the people who need it.** Board, funders,
partners. It is there to keep the site quiet, not secret, and anyone who has it
is not the risk.
