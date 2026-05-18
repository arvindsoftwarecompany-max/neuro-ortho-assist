## Plan: Google Chat Sheet + Lead Classification Module

### 1. Database Migration
Add column to `profiles` table:
- `google_sheet_chat_url` (text, default '') — Google Sheet link for chat/conversation history

### 2. Settings Page Update
- `src/pages/SettingsPage.tsx` aur `src/pages/ConfigPage.tsx` me naya input field "Google Chat Sheet URL" add karna
- Form state me `google_sheet_chat_url` add karna
- Save logic me include karna

### 3. New "Leads Classification" Menu Item
Sidebar me naya menu item:
- **Lead Classification** (icon: Flame/Thermometer)
- Route: `/lead-classification`

### 4. New Page: `src/pages/LeadClassification.tsx`
Three tabs/sections:
- 🔥 **Hot Lead** (red) — turant action chahiye
- 🌡️ **Warm Lead** (orange) — interested but not urgent
- ❄️ **Cold Lead** (blue) — low priority

Classification logic (based on existing lead data):
- **Hot**: `call_status` = "Appointment Booked" ya `priority` = "Urgent" ya severity = "Critical/High"
- **Warm**: `call_status` = "Contacted" ya "Followup" with priority = "High"
- **Cold**: `call_status` = "New Lead" / "Not Interested" / "Lost"

### 5. Lead Card Features (har card pe)
- Patient name, mobile, department
- **"Kyu Hot Lead hai?" description** — auto-generated reason (e.g. "Appointment booked for tomorrow, urgent priority")
- **"Aage kya karna hai?" next action** — auto-suggested (e.g. "Confirm appointment via WhatsApp")
- **Buttons:**
  - 💬 **Baat-cheet History** — Dialog kholega jisme Google Chat Sheet ka data dikhega (us patient ka mobile match karke)
  - 📞 **Call**
  - 📱 **WhatsApp**
  - 🔔 **Follow-up** — LeadUpdateSheet kholega update karne ke liye

### 6. Chat History Dialog
- Naya component `src/components/ChatHistoryDialog.tsx`
- Google Chat Sheet se data fetch karega (using `google_sheet_chat_url`)
- Mobile number se filter karke us patient ki saari conversations dikhayega
- Timestamp, message, sender display

### 7. Hook for Chat Data
- `src/hooks/useChatData.ts` — chat sheet fetch karne ke liye

### Files to create/edit:
- **Migration**: add `google_sheet_chat_url` column
- **Edit**: `src/pages/SettingsPage.tsx`, `src/pages/ConfigPage.tsx`, `src/components/AppSidebar.tsx`, `src/App.tsx` (route)
- **Create**: `src/pages/LeadClassification.tsx`, `src/components/ChatHistoryDialog.tsx`, `src/hooks/useChatData.ts`
