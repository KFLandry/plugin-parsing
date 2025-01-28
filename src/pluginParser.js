import esprima from "esprima";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import process from "process";

export default function pluginParser() {
  return {
    name: "plugin-parser",
    buildStart() {
      process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
      console.log(" Build starting! ");
    },

    async transform(src, id, options) {
      // Vérifier si le fichier est situé dans node_modules ou si c'est isReactRefresh
      if (options.ssr ? isExternalSSR(id) : isExternal(id)) {
        return null; // Renvoyer null pour ignorer la transformation
      }

      if (id.includes("@react-refresh")) {
        return null;
      }

      try {
        esprima.parseScript(src);
      } catch (error) {
        console.log(" Debut des pb 🫡🫡");
        fs.readFile(id, async (err, data) => {
          const filename = path.basename(id, path.extname(id));
          if (err) {
            console.log(`Tema, Je n'ai pas pu lire le fichier : ${id}`, err);
          } else {
            const pb = {
              ErrorMessage: error.message,
              pathFile: id,
              aiSuggesting: await suggestSomething(
                error,
                data.toString,
                filename
              ),
            };
            console.log(pb);
            // On écrit les suggestions dans un fichier
            await writeToFile(filename, pb);
          }
        });

        return {
          code: src,
          map: null,
        };
      }
    },
  };
}

async function suggestSomething(errorMessage, content, filename) {
  const openai = new OpenAI({
    apiKey:
      "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",
  });
  const prompt = `Vous êtes un expert en JavaScript... "${errorMessage},
    voici le code ... ${content}...`;

  try {
    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        {
          role: "system",
          content: "You are an expert developer in javascript.",
        },
        { role: "system", content: "You give a quick and concise response." },
        { role: "user", content: prompt },
      ],
      max_tokens: 1000,
    });
    return chatCompletion.choices[0].message.content;
  } catch (error) {
    log_error(filename, `Error contacting OpenAI API: ${error}`);
    return "Unable to retrieve a solution from OpenAI.";
  }
}
function isExternal(id) {
  return id.includes("node_modules");
}

function isExternalSSR(id) {
  return isExternal(id) && !id.includes("@vite");
}

function log_error(filename, message) {
  const filepath = path.join(__dirname, `temp/${filename}.log`);
  const writeStream = fs.createWriteStream(filepath);
  const date = new Date();
  writeStream.write(`[${date.toISOString()}] Message : ${message}`);
  writeStream.end();
}

async function writeToFile(filename, data) {
  const filepath = path.join(__dirname, `temp/${filename}.txt`);
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(filepath);
    writeStream.write(`Erreur : ${data.ErrorMessage}` + "\n");
    writeStream.write(`Path : ${data.pathFile}` + "\n");
    writeStream.write(
      `#################### AI Suggesting ####################` + "\n"
    );
    writeStream.write(`Message : ${data.aiSuggesting}` + "\n");
    writeStream.end((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
