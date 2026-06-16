const express = require("express");
const cors = require("cors");

const { MercadoPagoConfig, Payment } = require("mercadopago");

const app = express();

app.use(cors());
app.use(express.json());

// CONFIGURAÇÃO
const client = new MercadoPagoConfig({
  accessToken: "TEST-2506783482072783-122110-babf5a52b54750334e4f3034271b17a9-583771665"
});

const payment = new Payment(client);

// ROTA PIX
app.post("/criar-pagamento", async (req, res) => {

  try {

    const { valor, email } = req.body;

    const resposta = await payment.create({
      body: {
        transaction_amount: Number(valor),
        description: "Compra Biblioteca",
        payment_method_id: "pix",

        payer: {
          email: email
        }
      }
    });

    const dadosPix =
      resposta.point_of_interaction.transaction_data;

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

// SERVIDOR
app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});