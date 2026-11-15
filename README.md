# New Enterprise C1 — ინგლისურის ტრენაჟორი

თსუ-ს ინგლისურის კურსის სახელმძღვანელოს (New Enterprise B2+/C1, Express Publishing) Unit 1–3-ისა და Unit 4–6-ის სავარჯიშოები ერთ გვერდზე. პირველი გახსნისას გვერდი გეკითხება, რომელი ნაწილის სწავლა გინდა. ნაწილის გადართვა ნებისმიერ დროს შეიძლება ზედა ზოლის ღილაკებით, ტელეფონზე კი მენიუდან.

| ნაწილი | ერთეულები | კითხვები | კატეგორიები | ბარათები |
|---|---|---|---|---|
| Units 1–3 | Dream big · Touch of nature · Stuff that matters | 501 | 16 | 388 |
| Units 4–6 | Reshaping work · Rebooting happiness · What’s on tonight? | 508 | 14 | 354 |

- **კითხვები:** წინადადებაში გამოტოვებული სიტყვა ოთხი ვარიანტიდან უნდა აირჩიო. პასუხის შემდეგ ჩანს სრული წინადადება და მოკლე ქართული განმარტება. კატეგორიებია ლექსიკა ერთეულების მიხედვით, phrasal verbs, წინდებულები, იდიომები, სიტყვაწარმოება, გრამატიკა, Everyday English და წიგნის ტესტები (Workbook Revision, Grammar Book Progress Test).
- **ბარათები:** Student’s Book-ის Word List. ჩანს განმარტება და სიტყვა თავად უნდა აკრიფო. 💡 მინიშნება ასოებს თანდათან ხსნის.
- **შეცდომები და სტატისტიკა:** არასწორი პასუხი შეცდომების სიაში ხვდება. Statistics-ში ჩანს სიზუსტე კატეგორიების მიხედვით და ყველაზე რთული კითხვები.

## გახსნა

ონლაინ (GitHub Pages-ზე გამოქვეყნების შემდეგ): **https://guramzhgamadze.github.io/new_enterprise_trainer/**

პირდაპირი ბმული ნაწილზე: `…/#units-1-3` ან `…/#units-4-6`.

ლოკალურად `index.html` პირდაპირ იხსნება ბრაუზერში. სერვერით:

```bash
python -m http.server 8767 --directory .
```

პროგრესი ბრაუზერის localStorage-ში ინახება და თითო ნაწილს თავისი გასაღებები აქვს: `ne13v1`, `ne13snv1`, `ne13_audio` და `ne46v1`, `ne46snv1`, `ne46_audio`. ბოლოს არჩეული ნაწილი `ne_trainer_part`-შია. ეს გასაღებები იმავე guramzhgamadze.github.io-ზე განთავსებულ სხვა აპებს არ ერევა. ძველ ცალკე ფაილებში დაგროვებული პროგრესი ონლაინ ვერსიაში არ გადადის, რადგან ბრაუზერი მას სხვა მისამართისთვის ინახავს.

## სტრუქტურა

| ფაილი | რა არის |
|---|---|
| `index.html` | ტრენაჟორი; **დაგენერირებულია**, ხელით არ შეცვალოთ |
| `tools/parts/units-1-3-trainer.html`, `tools/parts/units-4-6-trainer.html` | ორი ნაწილის ცალკე ტრენაჟორი; `index.html` მათგან იგება |
| `tools/build_merged.js` | ორ ნაწილს ერთ გვერდად აერთიანებს; ჯერ ამოწმებს, რომ ორივე ნაწილის ძრავა ერთნაირია |
| `tools/setup.js`, `tools/chooser.html`, `tools/merged.css` | ნაწილის ასარჩევი ეკრანი და გადამრთველი |
| `tools/check_merged.js` | ამოწმებს, რომ `index.html`-ში ორივე ნაწილის ყველა კითხვა, ბარათი, მენიუ და ძრავა უცვლელადაა გადასული |

ძრავა (სტილი და JavaScript) Destination B1-ის word-patterns ტრენაჟორიდან არის აღებული. გარე ბიბლიოთეკა არ სჭირდება, მხოლოდ Google Fonts-ის შრიფტები იტვირთება.

## ცვლილება

1. შეცვალეთ ნაწილის ფაილი `tools/parts/`-ში.
2. ააწყვეთ `index.html` (საჭიროა Node.js, პაკეტების გარეშე):

```bash
node tools/build_merged.js tools/parts/units-1-3-trainer.html tools/parts/units-4-6-trainer.html index.html
```

3. შეამოწმეთ; უნდა დაიწეროს `OK`:

```bash
node tools/check_merged.js tools/parts/units-1-3-trainer.html tools/parts/units-4-6-trainer.html index.html
```

## წყარო

კითხვები და ბარათები ეფუძნება New Enterprise B2+/C1-ის Student’s Book-ს, Workbook C1-სა და Grammar Book C1-ს (Express Publishing). ბარათების განმარტებები და წიგნის ტესტების კითხვები წიგნიდანაა, ქართული განმარტებები და დანარჩენი კითხვები ახალია. მასალა პირადი სწავლისთვისაა.
