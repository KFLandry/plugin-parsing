import fs from "fs";

export default function myPlugin() {
  return {
    name: "my-plugin", // Nom unique du plugin

    // Hook exécuté au début du processus de build
    buildStart() {
      console.log("Build starting!");
    },
    transform(src, id) {
      if (id.endsWith(".txt")) {
        const content = fs.readFileSync(id, "utf-8");
        return {
          code: `export default "${content}";`,
          map: null, // Si vous avez une source map, vous pouvez la générer ici
        };
      }
    },
  };
}
