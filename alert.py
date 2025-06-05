# alert.py
from twilio.rest import Client
from config import TWILIO_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE

def send_sms(to_number, message):
    client = Client(TWILIO_SID, TWILIO_AUTH_TOKEN)
    sms = client.messages.create(
        to=to_number,
        from_=TWILIO_PHONE,
        body=message
    )
    return sms.sid

def make_call(to_number, url):
    client = Client(TWILIO_SID, TWILIO_AUTH_TOKEN)
    call = client.calls.create(
        to=to_number,
        from_=TWILIO_PHONE,
        url=url  # URL to TwiML XML instructions
    )
    return call.sid
