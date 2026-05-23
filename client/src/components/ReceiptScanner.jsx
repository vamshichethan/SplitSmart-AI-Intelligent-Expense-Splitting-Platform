import { ImageUp, ReceiptText, ScanLine } from "lucide-react";
import { useEffect, useState } from "react";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

export function ReceiptScanner({ group, receipt, onUpload, onExtract, onSave, isUploading, isExtracting, isSaving }) {
  const [assignments, setAssignments] = useState({});
  const [paidBy, setPaidBy] = useState(group.members[0]?.id ?? "");
  const [receiptText, setReceiptText] = useState("");
  const [uploadedReceipt, setUploadedReceipt] = useState(null);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    setPaidBy((current) => (group.members.some((member) => member.id === current) ? current : (group.members[0]?.id ?? "")));
  }, [group.id]);

  useEffect(() => {
    if (!receipt) return;

    setAssignments(
      Object.fromEntries(
        receipt.items.map((item) => [
          item.name,
          group.members.map((member) => member.id)
        ])
      )
    );
  }, [receipt, group.id]);

  function toggleAssignee(itemName, userId) {
    setAssignments((current) => {
      const existing = current[itemName] ?? [];
      const next = existing.includes(userId) ? existing.filter((id) => id !== userId) : [...existing, userId];
      return {
        ...current,
        [itemName]: next.length ? next : [userId]
      };
    });
  }

  function saveReceipt() {
    if (!receipt) return;

    onSave({
      paidBy,
      receipt: {
        ...receipt,
        items: receipt.items.map((item) => ({
          ...item,
          assignedTo: assignments[item.name] ?? group.members.map((member) => member.id)
        }))
      }
    });
  }

  async function uploadImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError("");
    try {
      setUploadedReceipt(await onUpload(file));
    } catch (error) {
      setUploadError(error.message);
    } finally {
      event.target.value = "";
    }
  }

  if (!receipt) {
    return (
      <div className="receipt-empty">
        <label className="receipt-upload-zone">
          <ImageUp size={20} />
          <span>{isUploading ? "Uploading receipt..." : "Upload receipt image"}</span>
          <small>JPG, PNG, or WebP up to 5 MB</small>
          <input type="file" accept="image/*" onChange={uploadImage} disabled={isUploading} />
        </label>
        {uploadedReceipt ? (
          <div className="upload-result">
            {uploadedReceipt.url ? <img src={uploadedReceipt.url} alt={uploadedReceipt.originalName ?? "Uploaded receipt"} /> : null}
            <div>
              <strong>{uploadedReceipt.provider === "cloudinary" ? "Uploaded to Cloudinary" : "Stored locally for this request"}</strong>
              <span>
                {uploadedReceipt.originalName ?? uploadedReceipt.publicId ?? "Receipt image"} ·{" "}
                {uploadedReceipt.size ? `${Math.round(uploadedReceipt.size / 1024)} KB` : `${uploadedReceipt.width}x${uploadedReceipt.height}`}
              </span>
            </div>
          </div>
        ) : null}
        {uploadError ? <p className="error-banner">{uploadError}</p> : null}
        <label>
          Receipt text
          <textarea
            value={receiptText}
            onChange={(event) => setReceiptText(event.target.value)}
            placeholder="Paste receipt lines here for Gemini extraction. Image upload stores the receipt in Cloudinary; text gives Gemini line items to parse."
            rows={6}
          />
        </label>
        <button className="secondary-button" onClick={() => onExtract(receiptText)} disabled={isExtracting}>
          <ScanLine size={18} />
          {isExtracting ? "Extracting..." : "Extract with Gemini"}
        </button>
      </div>
    );
  }

  return (
    <div className="receipt-preview">
      <div className="receipt-summary">
        <strong>{receipt.merchant}</strong>
        <span>{receipt.provider ?? "local"} · {Math.round(receipt.confidence * 100)}% confidence</span>
      </div>
      {receipt.note ? <p className="muted-line">{receipt.note}</p> : null}

      <label>
        Paid by
        <select value={paidBy} onChange={(event) => setPaidBy(event.target.value)}>
          {group.members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
      </label>

      <div className="receipt-item-list">
        {receipt.items.map((item) => (
          <article key={item.name} className="receipt-item">
            <div className="receipt-item-heading">
              <span>
                <ReceiptText size={16} />
                {item.name}
              </span>
              <strong>{currency.format(item.price)}</strong>
            </div>
            <div className="assignee-grid">
              {group.members.map((member) => (
                <label key={member.id} className="assignee-pill">
                  <input
                    type="checkbox"
                    checked={(assignments[item.name] ?? []).includes(member.id)}
                    onChange={() => toggleAssignee(item.name, member.id)}
                  />
                  {member.name}
                </label>
              ))}
            </div>
          </article>
        ))}
      </div>

      <footer>Total {currency.format(receipt.total)}</footer>
      <button className="primary-button" onClick={saveReceipt} disabled={isSaving}>
        <ReceiptText size={18} />
        {isSaving ? "Saving..." : "Save item-wise expense"}
      </button>
    </div>
  );
}
