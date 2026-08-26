/**
 * Verifies the contract shared by the Gallery, OpenAPI, and generated client.
 *
 * This is intentionally a static check. It catches a generated-client or
 * schema mismatch before the Academy build reaches the Gallery, without
 * requiring a database, Stripe connection, or running API server.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const paths = {
  apiSpec: resolve(workspaceRoot, "lib/api-spec/openapi.yaml"),
  generatedSchemas: resolve(
    workspaceRoot,
    "lib/api-client-react/src/generated/api.schemas.ts",
  ),
  generatedApi: resolve(
    workspaceRoot,
    "lib/api-client-react/src/generated/api.ts",
  ),
  productCard: resolve(
    workspaceRoot,
    "artifacts/aimd-academy/src/components/store/ProductCard.tsx",
  ),
  gallery: resolve(
    workspaceRoot,
    "artifacts/aimd-academy/src/pages/Gallery.tsx",
  ),
};

type GalleryFieldContract = {
  type: "string" | "number" | "boolean";
  required: boolean;
  enumName?: string;
};

const GALLERY_PRODUCT_FIELDS: Record<string, GalleryFieldContract> = {
  id: { type: "string", required: true },
  name: { type: "string", required: true },
  description: { type: "string", required: true },
  category: {
    type: "string",
    required: true,
    enumName: "StoreProductCategory",
  },
  imageUrl: { type: "string", required: true },
  productUrl: { type: "string", required: true },
  apparelNote: { type: "string", required: false },
  featured: { type: "boolean", required: true },
  inventoryLabel: { type: "string", required: true },
  unitAmount: { type: "number", required: true },
};

type GalleryProductField = keyof typeof GALLERY_PRODUCT_FIELDS;
type ParsedField = {
  type: string;
  required: boolean;
  enumValues: string[];
};

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function parseQuotedList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function parseOpenApiStoreProduct(
  source: string,
  errors: string[],
): {
  fields: Map<string, ParsedField>;
  required: Set<string>;
  enums: Map<string, string[]>;
} {
  const schemaMatch = source.match(
    /(?:^|\n)    StoreProduct:\n([\s\S]*?)(?=\n    [A-Z][A-Za-z0-9]+:\n|$)/,
  );
  if (!schemaMatch) {
    errors.push("OpenAPI schema is missing components.schemas.StoreProduct.");
    return { fields: new Map(), required: new Set(), enums: new Map() };
  }

  const schema = schemaMatch[1];
  const requiredMatch = schema.match(/^\s{6}required:\s*\[([\s\S]*?)\]/m);
  const required = new Set(
    requiredMatch ? parseQuotedList(requiredMatch[1]) : [],
  );
  if (!requiredMatch) {
    errors.push("OpenAPI StoreProduct is missing its required field list.");
  }

  const propertiesMatch = schema.match(/^\s{6}properties:\n([\s\S]*)$/m);
  const fields = new Map<string, ParsedField>();
  const enums = new Map<string, string[]>();
  if (!propertiesMatch) {
    errors.push("OpenAPI StoreProduct is missing its properties block.");
    return { fields, required, enums };
  }

  const properties = propertiesMatch[1];
  const propertyMatches = [
    ...properties.matchAll(/^ {8}([A-Za-z][A-Za-z0-9]*):\s*$/gm),
  ];
  for (const [index, propertyMatch] of propertyMatches.entries()) {
    const name = propertyMatch[1];
    const start = propertyMatch.index + propertyMatch[0].length;
    const end = propertyMatches[index + 1]?.index ?? properties.length;
    const property = properties.slice(start, end);
    const typeMatch = property.match(/^\s{10}type:\s*([a-z]+)/m);
    const enumMatch = property.match(/^\s{10}enum:\s*\[([^\]]*)\]/m);
    if (!typeMatch) {
      errors.push(
        `OpenAPI StoreProduct property "${name}" is missing its type.`,
      );
      continue;
    }
    const enumValues = enumMatch ? parseQuotedList(enumMatch[1]) : [];
    fields.set(name, {
      type: typeMatch[1] === "integer" ? "number" : typeMatch[1],
      required: required.has(name),
      enumValues,
    });
    if (enumValues.length) enums.set(name, enumValues);
  }

  return { fields, required, enums };
}

function parseGeneratedStoreProduct(
  source: string,
  errors: string[],
): Map<string, ParsedField> {
  const interfaceMatch = source.match(
    /export interface StoreProduct \{([\s\S]*?)\n\}/,
  );
  if (!interfaceMatch) {
    errors.push("Generated client is missing the StoreProduct interface.");
    return new Map();
  }

  const fields = new Map<string, ParsedField>();
  for (const match of interfaceMatch[1].matchAll(
    /^  ([A-Za-z][A-Za-z0-9]*)(\?)?:\s*([^;]+);$/gm,
  )) {
    const name = match[1];
    const type = match[3]
      .trim()
      .replace(/\s*\|\s*null/g, "")
      .trim();
    fields.set(name, {
      type,
      required: !match[2],
      enumValues: [],
    });
  }
  return fields;
}

function compareFieldSets(
  label: string,
  expected: Set<string>,
  actual: Set<string>,
  errors: string[],
): void {
  for (const field of expected) {
    if (!actual.has(field))
      errors.push(`${label} is missing Gallery field "${field}".`);
  }
  for (const field of actual) {
    if (!expected.has(field))
      errors.push(`${label} has unexpected StoreProduct field "${field}".`);
  }
}

function ensureFieldsPresent(
  label: string,
  expected: Set<string>,
  actual: Set<string>,
  errors: string[],
): void {
  for (const field of expected) {
    if (!actual.has(field))
      errors.push(`${label} is missing Gallery field "${field}".`);
  }
}

function parseGeneratedEnum(source: string, enumName: string): string[] {
  const enumMatch = source.match(
    new RegExp(`export const ${enumName} = \\{([\\s\\S]*?)\\n\\} as const;`),
  );
  if (!enumMatch) return [];
  return [
    ...enumMatch[1].matchAll(/^\s+[A-Za-z][A-Za-z0-9]*:\s*'([^']+)'/gm),
  ].map((match) => match[1]);
}

function compareValues(
  label: string,
  expected: string[],
  actual: string[],
  errors: string[],
): void {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  for (const value of expectedSet) {
    if (!actualSet.has(value))
      errors.push(`${label} is missing enum value "${value}".`);
  }
  for (const value of actualSet) {
    if (!expectedSet.has(value))
      errors.push(`${label} has unexpected enum value "${value}".`);
  }
}

function checkGalleryUsage(
  productCardSource: string,
  gallerySource: string,
  errors: string[],
): Set<string> {
  if (!/\bStoreProduct\b/.test(productCardSource)) {
    errors.push(
      "ProductCard no longer consumes the generated StoreProduct type.",
    );
  }
  if (!/\buseListStoreProducts\s*\(/.test(gallerySource)) {
    errors.push(
      "Gallery no longer consumes the generated useListStoreProducts query.",
    );
  }

  const usedFields = new Set<string>();
  for (const source of [productCardSource, gallerySource]) {
    for (const match of source.matchAll(
      /\b(?:product|p)\.([A-Za-z][A-Za-z0-9]*)\b/g,
    )) {
      usedFields.add(match[1]);
    }
  }
  ensureFieldsPresent(
    "Gallery usage",
    new Set(Object.keys(GALLERY_PRODUCT_FIELDS)),
    usedFields,
    errors,
  );
  return usedFields;
}

function checkGalleryCatalogContract(): void {
  const errors: string[] = [];
  const apiSpecSource = read(paths.apiSpec);
  const generatedSchemasSource = read(paths.generatedSchemas);
  const generatedApiSource = read(paths.generatedApi);
  const productCardSource = read(paths.productCard);
  const gallerySource = read(paths.gallery);

  const openApi = parseOpenApiStoreProduct(apiSpecSource, errors);
  const generated = parseGeneratedStoreProduct(generatedSchemasSource, errors);
  const galleryFields = new Set(Object.keys(GALLERY_PRODUCT_FIELDS));

  ensureFieldsPresent(
    "OpenAPI StoreProduct",
    galleryFields,
    new Set(openApi.fields.keys()),
    errors,
  );
  compareFieldSets(
    "Generated StoreProduct",
    new Set(openApi.fields.keys()),
    new Set(generated.keys()),
    errors,
  );

  for (const field of galleryFields) {
    const expected = GALLERY_PRODUCT_FIELDS[field as GalleryProductField];
    const schemaField = openApi.fields.get(field);
    const generatedField = generated.get(field);
    if (!schemaField || !generatedField) continue;

    if (schemaField.type !== expected.type) {
      errors.push(
        `OpenAPI StoreProduct.${field} is ${schemaField.type}; Gallery expects ${expected.type}.`,
      );
    }
    if (schemaField.required !== expected.required) {
      errors.push(
        `OpenAPI StoreProduct.${field} must be ${expected.required ? "required" : "optional"} for Gallery usage.`,
      );
    }
    if (generatedField.required !== schemaField.required) {
      errors.push(
        `Generated StoreProduct.${field} optionality does not match OpenAPI (${schemaField.required ? "required" : "optional"}).`,
      );
    }

    if (expected.enumName && generatedField.type !== expected.enumName) {
      errors.push(
        `Generated StoreProduct.${field} uses ${generatedField.type}; expected ${expected.enumName}.`,
      );
    } else if (!expected.enumName && generatedField.type !== expected.type) {
      errors.push(
        `Generated StoreProduct.${field} is ${generatedField.type}; expected ${expected.type}.`,
      );
    }
  }

  for (const [field, enumName] of [
    ["category", "StoreProductCategory"],
    ["fulfillmentType", "StoreProductFulfillmentType"],
  ] as const) {
    const schemaValues = openApi.enums.get(field) ?? [];
    const generatedValues = parseGeneratedEnum(
      generatedSchemasSource,
      enumName,
    );
    if (!schemaValues.length)
      errors.push(`OpenAPI StoreProduct.${field} is missing enum values.`);
    if (!generatedValues.length)
      errors.push(`Generated client is missing ${enumName} values.`);
    compareValues(
      `Generated ${enumName}`,
      schemaValues,
      generatedValues,
      errors,
    );
  }

  if (!/\/store\/products/.test(apiSpecSource)) {
    errors.push("OpenAPI is missing the /store/products endpoint.");
  }
  if (
    !/export const listStoreProducts = async[\s\S]*?Promise<StoreProduct\[\]>/.test(
      generatedApiSource,
    )
  ) {
    errors.push(
      "Generated client listStoreProducts does not return StoreProduct[].",
    );
  }
  if (!/export function useListStoreProducts\b/.test(generatedApiSource)) {
    errors.push("Generated client is missing useListStoreProducts.");
  }

  const usedGalleryFields = checkGalleryUsage(
    productCardSource,
    gallerySource,
    errors,
  );
  for (const field of usedGalleryFields) {
    if (!openApi.fields.has(field)) {
      errors.push(
        `Gallery uses StoreProduct.${field}, but OpenAPI StoreProduct does not define it.`,
      );
    }
    if (!generated.has(field)) {
      errors.push(
        `Gallery uses StoreProduct.${field}, but the generated client does not define it.`,
      );
    }
  }

  if (errors.length) {
    throw new Error(
      [
        "Gallery catalog contract drift detected:",
        ...errors.map((error) => `- ${error}`),
        "",
        "Update the OpenAPI schema and regenerate the API client before changing Gallery usage.",
      ].join("\n"),
    );
  }

  console.log(
    `Gallery catalog contract is in sync (${galleryFields.size} card/quick-view fields checked).`,
  );
}

checkGalleryCatalogContract();
