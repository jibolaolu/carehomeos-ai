def create_payment_link(invoice_id: str, amount_pence: int) -> dict[str, object]:
    return {
        "invoice_id": invoice_id,
        "amount_pence": amount_pence,
        "url": f"https://payments.local/carehomeos/{invoice_id}",
    }
