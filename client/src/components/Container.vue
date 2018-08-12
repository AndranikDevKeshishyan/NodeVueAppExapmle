<template>
  <div>
      <v-dialog v-model="dialog" max-width="500px" scrollable=false>
        <v-btn slot="activator" color="blue darken-1" dark class="mb-3">New Client</v-btn>
        <v-card>
          <v-card-title>
            <span class="headline">{{ formTitle }}</span>
          </v-card-title>

          <v-card-text>
            <v-container grid-list-md>
              <v-layout wrap>
                <v-flex xs12 sm3 md4>
                  <v-text-field v-model="editedClient.username" label="username"></v-text-field>
                </v-flex>
                <v-flex xs12 sm6 md4>
                  <v-text-field v-model="editedClient.email" label="email"></v-text-field>
                </v-flex>
                <v-flex xs12 sm6 md4>
                  <v-text-field v-model="editedClient.phone" label="phone"></v-text-field>
                </v-flex>
                <v-flex xs12 sm6 md4>
                  <v-text-field v-model="editedClient.providers" label="providers"></v-text-field>
                </v-flex>
              </v-layout>
            </v-container>
          </v-card-text>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="blue darken-1" flat @click.native="close">Cancel</v-btn>
            <v-btn color="blue darken-1" flat @click.native="save">Save</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    <v-toolbar flat color="blue">
      <v-toolbar-title>Clients</v-toolbar-title>
      <v-spacer></v-spacer>

    </v-toolbar>
    <v-data-table
      :headers="headers"
      :items="clients"
      hide-actions
      class="elevation-1"
    >
    <v-progress-linear slot="progress" color="blue" indeterminate></v-progress-linear>
      <template slot="items" slot-scope="props">
        <td class="text-xs-left">{{ props.item.username }}</td>
        <td class="text-xs-left">{{ props.item.email }}</td>
        <td class="text-xs-left">{{ props.item.phone }}</td>
        <td class="text-xs-left">{{ props.item.providers }}</td>
        <td class="justify-left layout px-30">
          <v-icon
            small
            class="mr-2"
            @click="editItem(props.item)"
          >
            edit
          </v-icon>
          <v-icon
            small
            @click="deleteItem(props.item)"
          >
            delete
          </v-icon>
        </td>
      </template>
      <template slot="no-data">
        <v-btn color="blue" @click="initialize">Reset</v-btn>
      </template>
    </v-data-table>
  </div>
</template>

<script>
  import axios from 'axios';

  export default {
    data: () => ({
      dialog: false,
      endpoint:'http://localhost:3000/api/v1/users/',
      headers: [
        { text: 'username', value: 'username' },
        { text: 'email', value: 'email' },
        { text: 'phone', value: 'phone' },
        { text: 'providers', value: 'providers' },
        { text: 'Actions', value: 'name', sortable: false }
      ],
      clients: [],
      editedIndex: -1,
      editedClient: {
        username: '',
        email: '',
        phone: '',
        providers: ''
      },
      defaultClient: {
         username: '',
         email: 0,
         phone: 0,
         providers: 24
      }
    }),

    computed: {
      formTitle () {
        return this.editedIndex === -1 ? 'New Client' : 'Edit Client'
      }
    },

    watch: {
      dialog (val) {
        val || this.close()
      }
    },

    created () {
      this.initialize()
    },

    methods: {
      initialize () {
          axios.get(this.endpoint).then((response)=>{
            this.clients = response.data.data;
          }).catch((error)=>{
              console.log('-----error-------');
              console.log(error);
          })
      },

      editItem (item) {
        console.log(this.clients.indexOf(item))
        this.editedIndex = this.clients.indexOf(item)
        this.editedClient = Object.assign({}, item)
        this.dialog = true
      },

      deleteItem (item) {
        const index = this.clients.indexOf(item);
       
        let confirmed = confirm('Are you sure you want to delete this client?');

        if(confirmed){
          axios.delete(this.endpoint, {params: this.clients[index]} ).then((response)=>{
             this.clients.splice(index, 1)
          }).catch((error)=>{
              console.log('-----error-------');
              console.log(error);
          })
        }
      },

      close () {
        this.dialog = false
        setTimeout(() => {
          this.editedClient = Object.assign({}, this.defaultClient)
          this.editedIndex = -1
        }, 300)
      },

      save () {
        if (this.editedIndex > -1) {
            let index = this.editedIndex;
            let assigned = Object.assign({}, this.clients[index], this.editedClient)
           
            axios.put(this.endpoint, this.editedClient ).then((response)=>{

            Object.assign(this.clients[index], this.editedClient);

            }).catch((error)=>{
                console.log('-----error-------');
                console.log(error);
            })
        } else {
           let assigned = Object.assign({}, this.clients[this.editedIndex], this.editedClient)
           axios.post(this.endpoint,this.editedClient).then((response)=>{
            this.clients.push(response.data.data);
          }).catch((error)=>{
              console.log('-----error-------');
              console.log(error);
          })
        }
        this.close()
      }
    }
  }
</script>