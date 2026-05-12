// server.js

const express = require("express");
const mercadopago = require("mercadopago");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

mercadopago.configure({
  access_token: "SEU_ACCESS_TOKEN"
});

// ROTA PARA CRIAR PAGAMENTO PIX
app.post("/criar-pagamento", async (req, res) => {
  try {
    const { valor, email } = req.body;

    const pagamento = await mercadopago.payment.create({
      transaction_amount: Number(valor),
      payment_method_id: "pix",

      payer: {
        email: email
      }
    });

    const dadosPix =
      pagamento.body.point_of_interaction.transaction_data;

    res.json({
      qr_code: dadosPix.qr_code,
      qr_code_base64: dadosPix.qr_code_base64,
      ticket_url: dadosPix.ticket_url
    });

  } catch (erro) {
    console.log(erro);

    res.status(500).json({
      erro: "Erro ao criar pagamento"
    });
  }
});

// WEBHOOK
app.post("/webhook", (req, res) => {
  console.log("Pagamento atualizado:", req.body);

  res.sendStatus(200);
});

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});