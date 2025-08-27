# 🧪 Vanilla JS Take-Home Challenge: Job Listings with Filters

## 🎯 Objective
Build a responsive job listings page using **only Vanilla JavaScript**, **HTML**, and **CSS**. The goal is to assess your ability to work with the DOM, handle data loading and manipulation, and create clean, usable UI without relying on frameworks.

---

## 📋 Requirements

### Functionality
- Load job data by **fetching a JSON file** from **this GitHub repository** using a raw file link (e.g. `https://raw.githubusercontent.com/your-org/repo/main/data.json`)
- Display a list of job cards including fields like:
  - Job role
  - Technologies (array)
  - Experience level
  - Salary (CTC)
  - Company name and location
- Implement **4 filter controls**:
  - **Role**: Single-select dropdown
  - **Technologies**: Multi-select (checkboxes or similar)
  - **Experience**: Dropdown menu
  - **CTC**: Range slider (min to max LPA)
- The job list should **update dynamically** based on selected filters — no page reloads
- Filter logic should be applied in real time as users change inputs

### Tech Constraints
- Use **Vanilla JavaScript** — no frameworks or libraries (e.g., no React, jQuery)
- Clean, semantic **HTML5**
- Use **CSS** for layout and styling (Flexbox or Grid encouraged)
- Must work in modern browsers (Chrome, Firefox, Edge)

---

## 💾 Sample Data Structure (This will be hosted in the GitHub repo you fetch from)
```json
[
  {
    "id": 1,
    "company": "Acme Corp",
    "role": "Frontend Developer",
    "location": "London",
    "type": "Full-Time",
    "technologies": ["JavaScript", "HTML", "CSS"],
    "experience": "2-4 years",
    "ctc": 5
  },
  {
    "id": 2,
    "company": "Beta Ltd",
    "role": "Backend Developer",
    "location": "Remote",
    "type": "Contract",
    "technologies": ["Node.js", "MongoDB"],
    "experience": "3-5 years",
    "ctc": 8
  }
]
```

You should **fetch** this data from the provided raw GitHub URL inside your JavaScript file.

---

## 📁 Expected Deliverables

Please submit the following files:

```
/your-project-folder
├── index.html
├── style.css
└── script.js
```

Include comments in your code to explain key decisions.

---

## ✅ What We'll Look For

| Area                   | What we’re looking for                                                   |
|------------------------|----------------------------------------------------------------------------|
| JavaScript Fluency     | Understanding of DOM, events, data handling                              |
| Performance Awareness  | Efficient filtering, minimal re-rendering                                |
| Code Structure         | Clean, modular functions, no global leaks                                |
| UI/UX Quality          | Easy-to-use filters, readable layout, responsive behaviour                |
| Styling Discipline     | Semantic HTML, use of CSS for layout, accessibility consideration         |
| Bonus Points           | ARIA roles, keyboard navigation, helper utilities, thoughtful abstractions |

---

## 🕒 Time Recommendation
This test is designed to take **2 to 3 hours**. You can spend more if you want to polish it — but we’re more interested in **clarity of thought and code** than perfection.

---

## 🚀 Submission Instructions
Please **fork this repository**, complete the challenge in your fork, and share the link to your forked repo with us.

Alternatively, you may submit a `.zip` file with all files included if GitHub is not an option.

Let us know if you have any questions — and good luck!

---

**Note:** This is not a pixel-perfect UI challenge — we care more about how you think, structure your code, and apply logic than how beautiful the layout is. Use the browser dev tools freely. Have fun!
