/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

// On page load, restore selected category and products from localStorage
window.addEventListener("DOMContentLoaded", async () => {
  // Restore category
  const savedCategory = localStorage.getItem("selectedCategory");
  if (savedCategory) {
    categoryFilter.value = savedCategory;
    const products = await loadProducts();
    const filteredProducts = products.filter(
      (product) => product.category === savedCategory
    );
    displayProducts(filteredProducts);
  } else {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        Select a category to view products
      </div>
    `;
  }
});

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

// Track selected products by their id (persisted in localStorage)
let selectedProductIds = JSON.parse(
  localStorage.getItem("selectedProductIds") || "[]"
);

// Create HTML for displaying product cards and add click handlers
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card${
      selectedProductIds.includes(product.id) ? " selected" : ""
    }" data-product-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
      <div class="product-desc-overlay" role="tooltip">
        ${
          product.description
            ? product.description
            : "No description available."
        }
      </div>
    </div>
  `
    )
    .join("");

  // Add click event listeners to each product card
  const cards = productsContainer.querySelectorAll(".product-card");
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const productId = parseInt(card.getAttribute("data-product-id"));
      // Toggle selection
      if (selectedProductIds.includes(productId)) {
        selectedProductIds = selectedProductIds.filter(
          (id) => id !== productId
        );
      } else {
        selectedProductIds.push(productId);
      }
      // Persist selection
      localStorage.setItem(
        "selectedProductIds",
        JSON.stringify(selectedProductIds)
      );
      // Update visual state
      displayProducts(products);
      updateSelectedProductsList(products);
    });
  });
  // Update selected products list
  updateSelectedProductsList(products);
}

// Update the selected products list above the button
function updateSelectedProductsList(allProducts) {
  const selectedProductsList = document.getElementById("selectedProductsList");
  const selectedProducts = allProducts.filter((p) =>
    selectedProductIds.includes(p.id)
  );
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML =
      '<div class="placeholder-message">No products selected yet.</div>';
    // Show clear button only if there are selections
    const clearBtn = document.getElementById("clearSelectedProductsBtn");
    if (clearBtn) clearBtn.style.display = "none";
    return;
  }
  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
        <div class="selected-product-item" data-product-id="${product.id}">
          <img src="${product.image}" alt="${product.name}" class="selected-product-thumb">
          <span>${product.name} <small>(${product.brand})</small></span>
          <button class="remove-product-btn" title="Remove" data-remove-id="${product.id}">&times;</button>
        </div>
      `
    )
    .join("");

  // Add remove button listeners
  const removeBtns = selectedProductsList.querySelectorAll(
    ".remove-product-btn"
  );
  removeBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const removeId = parseInt(btn.getAttribute("data-remove-id"));
      selectedProductIds = selectedProductIds.filter((id) => id !== removeId);
      localStorage.setItem(
        "selectedProductIds",
        JSON.stringify(selectedProductIds)
      );
      updateSelectedProductsList(allProducts);
      // Also update product grid highlight
      displayProducts(
        allProducts.filter((p) => p.category === categoryFilter.value)
      );
    });
  });

  // Show clear all button
  let clearBtn = document.getElementById("clearSelectedProductsBtn");
  if (!clearBtn) {
    clearBtn = document.createElement("button");
    clearBtn.id = "clearSelectedProductsBtn";
    clearBtn.className = "generate-btn";
    clearBtn.style.marginTop = "10px";
    clearBtn.textContent = "Clear All";
    clearBtn.addEventListener("click", () => {
      selectedProductIds = [];
      localStorage.setItem(
        "selectedProductIds",
        JSON.stringify(selectedProductIds)
      );
      updateSelectedProductsList(allProducts);
      displayProducts(
        allProducts.filter((p) => p.category === categoryFilter.value)
      );
    });
    selectedProductsList.parentNode.appendChild(clearBtn);
  }
  clearBtn.style.display = "block";
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  // Save selected category to localStorage
  localStorage.setItem("selectedCategory", selectedCategory);

  // Reset selected products when changing category
  selectedProductIds = [];
  localStorage.setItem(
    "selectedProductIds",
    JSON.stringify(selectedProductIds)
  );

  // Filter products by selected category
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* Add some CSS for selected product card highlight (students: add to style.css for better visuals) */
// .product-card.selected { border: 2px solid #0078d4; box-shadow: 0 0 8px #0078d4; }

// Store the full chat conversation as an array of messages
let chatMessages = null;

// Load product data from products.json and initialize chatMessages
async function getChatMessages() {
  if (!chatMessages) {
    try {
      const response = await fetch("products.json");
      const data = await response.json();
      // Add product data to the system prompt
      chatMessages = [
        {
          role: "system",
          content: `You are a friendly beauty and skincare assistant. Guide the user through a short conversation by asking 2–3 simple questions, one at a time, to learn their preferences (such as skin type, product type, or concern). After getting their answers, recommend the top matching products from the list below.\n\nWhen you respond:\n- Always use a bulleted list for product recommendations.\n- For each product, include only the product name, brand (in parentheses), and a short summary (1–2 sentences) of the description. Do not include the full product description.\n- When giving a routine, use bullet points for each step and cite the product name and brand in parentheses for each step (e.g., "- Cleanse your face (CeraVe Foaming Facial Cleanser by CeraVe)").\n- If you mention a product, always include its brand in parentheses.\n- Use a natural, conversational, and encouraging tone.\n- Keep your questions and advice beginner-friendly.\n\nHere is the product data you can use to make recommendations: ${JSON.stringify(
            data.products
          )}`,
        },
      ];
    } catch (e) {
      // Fallback if products.json fails to load
      chatMessages = [
        {
          role: "system",
          content: "You are a helpful beauty and skincare advisor.",
        },
      ];
    }
  }
  return chatMessages;
}

// Helper function to update the chat window with the conversation
function renderChat() {
  if (!chatMessages) return;
  // Only show user and assistant messages (skip system)
  const visibleMessages = chatMessages.filter(
    (msg) => msg.role === "user" || msg.role === "assistant"
  );
  chatWindow.innerHTML = visibleMessages
    .map((msg) => {
      if (msg.role === "user") {
        return `<div class=\"user-message\"><strong>You:</strong> ${msg.content}</div>`;
      } else {
        return `<div class=\"assistant-message\"><strong>Advisor:</strong> ${msg.content}</div>`;
      }
    })
    .join("");
}

// Listen for chat form submission
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Only initialize chatMessages if not already set (preserve conversation)
  await getChatMessages();

  // Get the user's message from the input field
  const userInput = document.getElementById("userInput").value;

  // Add the user's message to the conversation
  chatMessages.push({ role: "user", content: userInput });

  // Show the updated chat with a loading message
  renderChat();
  chatWindow.innerHTML += `<div class=\"loading-message\">Thinking...</div>`;

  try {
    // Send the full conversation to the OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Use your OpenAI API key from secrets.js
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: chatMessages,
        max_tokens: 700,
        temperature: 0.7,
      }),
    });

    // Parse the JSON response
    const data = await response.json();

    // Check if the API returned a valid message
    if (
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      // Add the assistant's reply to the conversation
      chatMessages.push({
        role: "assistant",
        content: data.choices[0].message.content,
      });
      renderChat();
    } else {
      chatWindow.innerHTML += `<div class=\"error-message\">Sorry, I couldn't get a response. Please try again.</div>`;
    }
  } catch (error) {
    chatWindow.innerHTML += `<div class=\"error-message\">Error: ${error.message}</div>`;
  }

  // Clear the input field after sending
  document.getElementById("userInput").value = "";
});

// Listen for Generate Routine button click
const generateRoutineBtn = document.getElementById("generateRoutine");
generateRoutineBtn.addEventListener("click", async () => {
  // Get all products (to match selected IDs)
  const allProducts = await loadProducts();
  const selectedProducts = allProducts.filter((p) =>
    selectedProductIds.includes(p.id)
  );

  if (selectedProducts.length === 0) {
    chatWindow.innerHTML += `<div class=\"error-message\">Please select at least one product to generate a routine.</div>`;
    return;
  }

  // Only initialize chatMessages if not already set (preserve conversation)
  await getChatMessages();

  // Add a user message describing the selected products and allow any combination/order
  chatMessages.push({
    role: "user",
    content: `Here are the products I've selected: ${selectedProducts
      .map((p) => `${p.name} (${p.brand})`)
      .join(
        ", "
      )}. Please create a personalized skincare or beauty routine using any combination and order of these products that makes sense. You do not have to use all of them. Format the routine with clear steps and bullet points.`,
  });

  // Show loading message
  renderChat();
  chatWindow.innerHTML += `<div class=\"loading-message\">Generating your routine...</div>`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: chatMessages,
        max_tokens: 700,
        temperature: 0.7,
      }),
    });
    const data = await response.json();
    if (
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      chatMessages.push({
        role: "assistant",
        content: data.choices[0].message.content,
      });
      renderChat();
    } else {
      chatWindow.innerHTML += `<div class=\"error-message\">Sorry, I couldn't generate a routine. Please try again.</div>`;
    }
  } catch (error) {
    chatWindow.innerHTML += `<div class=\"error-message\">Error: ${error.message}</div>`;
  }
});
