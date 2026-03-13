## Long-term Rental API

This API allows you to rent virtual phone numbers for long-term use, manage rentals, renew subscriptions, and receive SMS. All requests must include your API token for authentication.

**Protocol Description**

All requests should go to **https://api.sms-bus.com**

All requests must have an [API Key](https://sms-bus.com/profile) as a parameter "token"

------

### Get available rental areas

GET - https://api.sms-bus.com/v1/rent/list/area?token=$token

**Parameters**

| Field | Location | Type   | Required | Description  |
| ----- | -------- | ------ | -------- | ------------ |
| token | query    | String | Yes      | Your API KEY |

**Result**

Success

```text
{
  "code": 200,
  "message": "Operation Success",
  "data": [
    {
      "area_code": "CA",
      "area_title": "Canada",
      "unit_price": 200,
      "min_month": 1,
      "total": 48
    },
    {
      "area_code": "GB",
      "area_title": "United Kingdom",
      "unit_price": 400,
      "min_month": 1,
      "total": 41
    },
    {
      "area_code": "US",
      "area_title": "United States of America",
      "unit_price": 200,
      "min_month": 1,
      "total": 184
    }
  ]
}
```

**Field Description**

- `area_code`: Area code (e.g., US, CA, GB)
- `area_title`: Area name
- `unit_price`: Monthly price in cents
- `min_month`: Minimum rental period in months
- `total`: Available numbers count

Possible Errors

```text
{
  "code": 401,
  "message": "Wrong token!"
}
```

------

### Rent a number

GET - https://api.sms-bus.com/v1/rent/get/number?token=$token&area_code=$area_code&time=$time

**Parameters**

| Field     | Location | Type    | Required | Description                  |
| --------- | -------- | ------- | -------- | ---------------------------- |
| token     | query    | String  | Yes      | Your API KEY                 |
| area_code | query    | String  | Yes      | Area code (e.g., US, CA, GB) |
| time      | query    | Integer | Yes      | Rental period in months      |

**Result**

Success

```text
{
  "code": 200,
  "message": "Operation Success",
  "data": {
    "order_id": "2667702625210000003",
    "mobile_number": "5143080170",
    "dialing_code": "1",
    "area_code": "CA",
    "expire_at": "2026-02-06T12:30:25Z",
    "keep_at": "2026-02-13T12:30:25Z"
  }
}
```

**Field Description**

- `order_id`: Order ID
- `mobile_number`: Rented phone number
- `dialing_code`: Country dialing code
- `area_code`: Area code
- `expire_at`: Expiration date (ISO 8601 format)
- `keep_at`: Number reservation end date (renewal must be done before this date)

Possible Errors

```text
{
  "code": 401,
  "message": "Wrong token!"
}
{
  "code": 50004,
  "message": "Not enough numbers available, please try again later"
}
{
  "code": 50201,
  "message": "Balance not enough"
}
{
  "code": 50208,
  "message": "This account is not activated, please click the activation link in the mailbox to activate"
}
{
  "code": 50401,
  "message": "No available area found."
}
{
  "code": 50402,
  "message": "Minimum rent time are not met."
}
```

------

### Renew a rented number

Renew subscription for a rented number. Note: Renewal must be completed before the keep_at date, after which renewal is no longer possible.

GET - https://api.sms-bus.com/v1/rent/renew/number?token=$token&area_code=$area_code&mobile_number=$mobile_number&time=$time

**Parameters**

| Field         | Location | Type    | Required | Description              |
| ------------- | -------- | ------- | -------- | ------------------------ |
| token         | query    | String  | Yes      | Your API KEY             |
| area_code     | query    | String  | Yes      | Area code                |
| mobile_number | query    | String  | Yes      | Phone number to renew    |
| time          | query    | Integer | Yes      | Renewal period in months |

**Result**

Success

```text
{
  "code": 200,
  "message": "Operation Success",
  "data": {
    "order_id": "2667702651210000003",
    "mobile_number": "5143080170",
    "dialing_code": "1",
    "area_code": "CA",
    "expire_at": "2026-03-06T12:30:25Z",
    "keep_at": "2026-03-13T12:30:25Z"
  }
}
```

**Field Description**

- `order_id`: Order ID
- `mobile_number`: Rented phone number
- `dialing_code`: Country dialing code
- `area_code`: Area code
- `expire_at`: Expiration date (ISO 8601 format)
- `keep_at`: Number reservation end date (renewal must be done before this date)

Possible Errors

```text
{
  "code": 401,
  "message": "Wrong token!"
}
{
  "code": 50201,
  "message": "Balance not enough"
}
{
  "code": 50401,
  "message": "No available area found."
}
{
  "code": 50402,
  "message": "Minimum rental time are not met."
}
{
  "code": 50404,
  "message": "Unable to renew as the number has been released."
}
```

------

### Cancel rental order

Cancel a rental order. Can only be cancelled within 20 minutes of ordering and only if no SMS has been received. Each number only can be cancelled 3 times. Warning: Excessive cancellations may result in account suspension.

GET - https://api.sms-bus.com/v1/rent/cancel/order?token=$token&order_id=$order_id

**Parameters**

| Field    | Location | Type   | Required | Description  |
| -------- | -------- | ------ | -------- | ------------ |
| token    | query    | String | Yes      | Your API KEY |
| order_id | query    | String | Yes      | Order ID     |

**Result**

Success

```text
{
  "code": 200,
  "message": "Operation Success",
  "data": "Cancel successful"
}
```

Possible Errors

```text
{
  "code": 401,
  "message": "Wrong token!"
}
{
  "code": 50005,
  "message": "Can't change order status because the order has already closed."
}
{
  "code": 50403,
  "message": "Unable to cancel the order as the SMS has been received."
}
{
  "code": 50405,
  "message": "Number has been canceled 3 times, can not continue to cancel the order"
}
```

------

### List rented numbers

Retrieve all numbers currently rented by your account.

GET - https://api.sms-bus.com/v1/rent/list/number?token=$token&only_active=$only_active&page_num=$page_num&page_size=$page_size

**Parameters**

| Field         | Location | Type    | Required | Description                                |
| ------------- | -------- | ------- | -------- | ------------------------------------------ |
| token         | query    | String  | Yes      | Your API KEY                               |
| area_code     | query    | String  | No       | Area code                                  |
| mobile_number | query    | String  | No       | Phone number                               |
| only_active   | query    | Boolean | No       | Filter only active numbers (default: true) |
| page_num      | query    | Integer | No       | Page number (default: 1)                   |
| page_size     | query    | Integer | No       | Items per page (default: 10, max: 500)     |

**Result**

Success

```text
{
  "code": 200,
  "message": "Operation Success",
  "data": {
    "page_num": 1,
    "page_size": 10,
    "total_page": 1,
    "total": 3,
    "list": [
      {
        "area_code": "US",
        "area_name": "United States of America",
        "dialing_code": "1",
        "mobile_number": "9302778494",
        "first_seen_at": "2024-12-15T01:59:49Z",
        "expire_at": "2025-04-15T01:59:49Z",
        "keep_at": "2025-04-22T01:59:49Z",
        "auto_renew": false,
        "sms_link": "https://sms.sms-bus.com/link/us/9302778494/iDdF",
        "allow_link": false
      }
    ]
  }
}
```

**Field Description**

- `area_code`: Area code
- `area_name`: Area name
- `dialing_code`: Country dialing code
- `mobile_number`: Phone number
- `first_seen_at`: First rental date
- `expire_at`: Expiration date
- `keep_at`: Number reservation end date
- `auto_renew`: Auto-renewal status
- `sms_link`: Quick link to view latest SMS
- `allow_link`: Whether link access is enabled

Possible Errors

```text
{
  "code": 401,
  "message": "Wrong token!"
}
```

------

### List rental orders

Retrieve rental order history.

GET - https://api.sms-bus.com/v1/rent/list/order?token=$token&only_active=$only_active&page_num=$page_num&page_size=$page_size

**Parameters**

| Field         | Location | Type    | Required | Description                            |
| ------------- | -------- | ------- | -------- | -------------------------------------- |
| token         | query    | String  | Yes      | Your API KEY                           |
| area_code     | query    | String  | No       | Area code                              |
| mobile_number | query    | String  | No       | Phone number                           |
| page_num      | query    | Integer | No       | Page number (default: 1)               |
| page_size     | query    | Integer | No       | Items per page (default: 10, max: 500) |

**Result**

Success

```text
{
  "code": 200,
  "message": "Operation Success",
  "data": {
    "page_num": 1,
    "page_size": 10,
    "total_page": 1,
    "total": 3,
    "list": [
      {
        "order_id": "2667702651210000003",
        "area_code": "CA",
        "area_name": "Canada",
        "dialing_code": "1",
        "mobile_number": "5143080170",
        "rent_month": 1,
        "amount": 200,
        "status": "CANCEL",
        "order_at": "2026-01-06T12:30:52Z",
        "begin_at": "2026-02-06T12:30:25Z",
        "expire_at": "2026-03-06T12:30:25Z",
        "keep_at": "2026-03-13T12:30:25Z"
      }
    ]
  }
}
```

**Field Description**

- `order_id`: Order ID
- `area_code`: Area code
- `area_name`: Area name
- `dialing_code`: Country dialing code
- `mobile_number`: Phone number
- `rent_month`: Rental period in months
- `amount`: Price in cents
- `status`: Order status (COMPLETED, CANCEL)
- `order_at`: Order date
- `begin_at`: Service start date
- `expire_at`: Service end date
- `keep_at`: Number reservation end date

Possible Errors

```text
{
  "code": 401,
  "message": "Wrong token!"
}
```

------

### Get latest SMS

Retrieve the most recent SMS message received on a rented number.

GET - https://api.sms-bus.com/v1/rent/get/sms?token=$token&area_code=$area_code&mobile_number=$mobile_number

**Parameters**

| Field         | Location | Type   | Required | Description  |
| ------------- | -------- | ------ | -------- | ------------ |
| token         | query    | String | Yes      | Your API KEY |
| area_code     | query    | String | Yes      | Area code    |
| mobile_number | query    | String | Yes      | Phone number |

**Result**

Success

```text
{
  "code": 200,
  "message": "Operation Success",
  "data": {
    "content": "Telegram code: 41529",
    "receive_at": "2025-02-15T08:19:34Z"
  }
}
```

**Field Description**

- `content`: SMS message content
- `receive_at`: Received Time (ISO 8601 format)

Possible Errors

```text
{
  "code": 401,
  "message": "Wrong token!"
}
{
  "code": 404,
  "message": "Number not found."
}
```

------

### List SMS messages

Retrieve SMS message history for a rented number.

GET - https://api.sms-bus.com/v1/rent/list/sms?token=$token&area_code=$area_code&mobile_number=$mobile_number&page_num=$page_num&page_size=$page_size

**Parameters**

| Field         | Location | Type    | Required | Description                            |
| ------------- | -------- | ------- | -------- | -------------------------------------- |
| token         | query    | String  | Yes      | Your API KEY                           |
| area_code     | query    | String  | Yes      | Area code                              |
| mobile_number | query    | String  | Yes      | Phone number                           |
| page_num      | query    | Integer | No       | Page number (default: 1)               |
| page_size     | query    | Integer | No       | Items per page (default: 10, max: 500) |

**Result**

Success

```text
{
  "code": 200,
  "message": "Operation Success",
  "data": {
    "page_num": 1,
    "page_size": 10,
    "total_page": 1,
    "total": 3,
    "list": [
      {
        "content": "It expires in 15 minutes. We'll never call or text to request this code.",
        "receive_at": "2025-02-14T08:21:10Z"
      },
      {
        "content": "445088 is your OTP. Do not share it with anyone.",
        "receive_at": "2025-01-15T07:54:44Z"
      }
    ]
  }
}
```

**Field Description**

- `content`: SMS message content
- `receive_at`: Received Time (ISO 8601 format)

Possible Errors

```text
{
  "code": 401,
  "message": "Wrong token!"
}
{
  "code": 404,
  "message": "Number not found."
}
```

------

### Change SMS link status

Enable or disable public link access for viewing SMS messages on a rented number.

GET - https://api.sms-bus.com/v1/rent/change/link/status?token=$token&area_code=$area_code&mobile_number=$mobile_number&status=$status

**Parameters**

| Field         | Location | Type    | Required | Description                           |
| ------------- | -------- | ------- | -------- | ------------------------------------- |
| token         | query    | String  | Yes      | Your API KEY                          |
| area_code     | query    | String  | Yes      | Area code                             |
| mobile_number | query    | String  | Yes      | Phone number                          |
| status        | query    | Boolean | Yes      | Enable (true) or disable (false) link |

**Result**

Success

```text
{
  "code": 200,
  "message": "Operation Success",
  "data": false
}
```

The response data field returns the updated link status (true = enabled, false = disabled).

Possible Errors

```text
{
  "code": 401,
  "message": "Wrong token!"
}
{
  "code": 404,
  "message": "Number not found."
}
```