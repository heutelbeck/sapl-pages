---
layout: default
title: jwt
parent: Functions
grand_parent: SAPL Reference
nav_order: 113
---
# jwt

Functions for evaluating JSON Web Tokens.
The contents of the token are returned without verifying the token's validity.



---

## jwt.parseJwt(Text rawToken)

```parseJwt(TEXT rawToken)```:
This function parses the raw encoded JWT Token and converts it into a SAPL value with the decoded contents
of the token. The token is not validated by this function. Use the JWT PIPs/Attributes for this purpose,
as the validity is time dependent.

**Example:**

```
policy "jwt example"
permit
where
  var rawToken = "eyJraWQiOiI3ZGRkYzMwNy1kZGE0LTQ4ZjUtYmU1Yi00MDZlZGFmYjc5ODgiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyMSIsImF1ZCI6Im1pc2thdG9uaWMtY2xpZW50IiwibmJmIjoxNjM1MjUxNDE1LCJzY29wZSI6WyJmYWN1bHR5LnJlYWQiLCJib29rcy5yZWFkIl0sImlzcyI6Imh0dHA6XC9cL2F1dGgtc2VydmVyOjkwMDAiLCJleHAiOjE2MzUyNTE3MTUsImlhdCI6MTYzNTI1MTQxNX0.V0-bViu4pFVufOzrn8yTQO9TnDAbE-qEKW8DnBKNLKCn2BlrQHbLYNSCpc4RdFU-cj32OwNn3in5cFPtiL5CTiD-lRXxnnc5WaNPNW2FchYag0zc252UdfV0Hs2sOAaNJ8agJ_uv0fFupMRS340gNDFFZthmjhTrDHGErZU7qxc1Lk2NF7-TGngre66-5W3NZzBsexkDO9yDLP11StjF63705juPFL2hTdgAIqLpsIOMwfrgoAsl0-6P98ecRwtGZKK4rEjUxBwghxCu1gm7eZiYoet4K28wPoBzF3hso4LG789N6GJt5HBIKpob9Q6G1ZJhMgieLeXH__9jvw1e0w";
  "books.read" in jwt.parseJwt(rawToken).payload.scope;
```

In this case, the statement ```"books.read" in jwt.parseJwt(rawToken).payload.scope;``` will evaluate to
```true```, as the the result of the ```parseJwt``` function would be:
```
{
  "header": {
              "kid":"7dddc307-dda4-48f5-be5b-406edafb7988",
              "alg":"RS256"
            },
  "payload": {
               "sub":"user1",
               "aud":"miskatonic-client",
               "nbf":"2021-10-26T12:30:15Z",
               "scope":["faculty.read","books.read"],
               "iss":"http://auth-server:9000",
               "exp":"2021-10-26T12:35:15Z",
               "iat":"2021-10-26T12:30:15Z"
             }
}
```


---

