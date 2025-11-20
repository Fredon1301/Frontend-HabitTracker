# 📈 Frontend - HabitTracker

Este repositório contém o código-fonte da interface de usuário (*frontend*) do aplicativo **HabitTracker**, uma ferramenta desenvolvida a ajudar você a construir e manter bons hábitos.

O *frontend* é responsável por toda a interação visual do usuário, exibição do progresso dos hábitos e comunicação com o *backend* (API) para salvar e recuperar dados.

## 🌟 Funcionalidades

* **Rastreamento Diário:** Marque facilmente seus hábitos como concluídos a cada dia.
* **Visualização de Progresso:** Gráficos e painéis intuitivos para visualizar suas sequências (*streaks*) e o histórico de conclusão dos hábitos.
* **Gestão de Hábitos:** Crie, edite e arquive hábitos com metas e descrições personalizadas.
* **Design Responsivo:** Interface otimizada para uso em dispositivos móveis e desktop.

## 🛠️ Tecnologias Utilizadas


* **Linguagem:** **JavaScript** / **TypeScript**
* **Framework/Biblioteca:** **React**

## ⚙️ Instalação e Configuração

Siga estes passos para configurar e executar o projeto em sua máquina local.

### Pré-requisitos

Certifique-se de ter o **Node.js** e o **npm** (ou **yarn**) instalados.

### Passos

1.  **Clone o repositório:**
    ```bash
    git clone [https://github.com/Fredon1301/Frontend-HabitTracker.git](https://github.com/Fredon1301/Frontend-HabitTracker.git)
    cd Frontend-HabitTracker
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    # ou
    yarn install
    ```

3.  **Configuração da API (Backend):**
    Este *frontend* precisa de uma API de *backend* em execução para funcionar.

    * Crie um arquivo `.env` na raiz do projeto.
    * Defina a URL da sua API de *backend*. Exemplo:
        ```env
        REACT_APP_API_URL=http://localhost:3000/api/
        ```

4.  **Execute o aplicativo:**
    ```bash
    npm start
    # ou
    yarn start
    ```

O aplicativo deve ser aberto automaticamente no seu navegador, geralmente em `http://localhost:3000` (ou outra porta definida).

## 💡 Uso (Desenvolvimento)

Este é um projeto de *frontend*. Após rodar o comando `npm start`, você pode começar a modificar os componentes, estilos e lógica de apresentação. Qualquer alteração salva será recarregada automaticamente no navegador.

## 🤝 Contribuição

Sinta-se à vontade para sugerir melhorias, relatar bugs ou contribuir com código.

1.  Faça um **Fork** do projeto.
2.  Crie sua *Branch* de recurso (`git checkout -b feature/minha-feature`).
3.  Comite suas mudanças (`git commit -m 'feat: Adiciona componente X'`).
4.  Faça o *Push* para a *Branch* (`git push origin feature/minha-feature`).
5.  Abra um **Pull Request (PR)**.

## 📜 Licença

Distribuído sob a Licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais informações.

---

**Link do Repositório:** [https://github.com/Fredon1301/Frontend-HabitTracker](https://github.com/Fredon1301/Frontend-HabitTracker)
