# argo-load-image-comitter


| ENV variable  | REQUIRED | DEFAULT |
|---|----------|---------|
| GH_TOKEN  | true     |         |
| GH_USER  | true     |         |
| GH_URL  | false     |         |
| BASE_REPO_NAME  | true     |         |
| FROM_INDEX  | false    | 0       |
| TO_INDEX  | false     | 0       |
| COMMIT_DEV_DELAY_SEC  | true     | 60      |
| COMMIT_PRODUCT_DELAY_SEC  | true     | 60      |

Run command

```
ts-node index.ts
```
