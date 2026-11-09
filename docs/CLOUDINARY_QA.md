# Cloudinary QA inventory

Provider calls are mocked. The browser uses an isolated Worker and disposable D1 on port 8789; it never uses the development or production media database.

| Claim / control          | Functional check                                                                                                | Visual state / evidence                                 |
| ------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Library and skeletons    | Delay listing, confirm skeleton; release and confirm empty state                                                | Arabic desktop skeleton; English empty state            |
| Upload and progress      | Select valid image, enter both alt texts, upload; inspect real browser upload progress and processing           | Busy form, progress, completed card and decoded preview |
| Upload failure and retry | Inject provider failure; confirm retained file/fields; retry successfully                                       | Localized error and retry button                        |
| Metadata and visibility  | Edit both alt texts; public → private → public; directly request private without a session                      | Saved card, edit form in both languages                 |
| Replacement and cancel   | Cancel once; replace; verify same ID/URL, refreshed preview and metadata                                        | Replacement notice, disabled visibility, resulting card |
| References and deletion  | Add content reference; verify usage and disabled deletion; remove reference; cancel deletion once, then confirm | Usage message and delete states                         |
| Preview failure          | Fail an image request, retry and confirm decoded image                                                          | Error placeholder, restored image                       |
| Responsive and themes    | English/Arabic, light/dark, 1440px and 390px; no overflow                                                       | Desktop and phone screenshots of populated library      |

Backend coverage includes role/authentication failures, invalid signatures and MIME types, oversize files, missing credentials, provider authentication/network/response errors, D1 rollback and compensation, concurrent replacement, private GET/HEAD, sanitized responses, unchanged references, publication and revision usage, deletion failure, scheduled cleanup, and historical record preservation.

Real provider verification remains pending credentials: upload a public and private image; load both as editor; request private URL in a signed-out browser; replace an image; toggle visibility; delete unused images; confirm Cloudinary originals and eager derivatives remain authenticated. No ordinary public or signed provider URL should appear in browser responses.
