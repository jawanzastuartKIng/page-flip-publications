# Reusable PDF Flipbook

A static, responsive PDF flipbook designed for GitHub Pages. It requires no database and does not upload a visitor's locally selected PDF.

## Quick setup

1. Upload these files to a GitHub repository.
2. Add your PDF to the same repository, for example `magazine.pdf`.
3. In `config.js`, change `defaultPdf` to `"magazine.pdf"` and update the title and colors.
4. In the repository, open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.

Your public address will be `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`.

## Reuse it for different PDFs

- Replace the default PDF and edit `config.js`.
- Or link to a PDF using a query string:
  `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/?pdf=another-file.pdf&title=Another%20Publication`
- Or leave `defaultPdf` blank. Visitors can choose or drag in a PDF from their own computer. That PDF stays local to their browser.

## Notes

- File names should avoid spaces; use names such as `annual-report-2026.pdf`.
- GitHub limits individual repository files to 100 MB. Optimize larger PDFs before uploading.
- The viewer loads PDF.js from Cloudflare's public CDN, so an internet connection is required.
- For PDFs hosted on another website, that server must permit cross-origin access. Keeping PDFs in this repository avoids that issue.
